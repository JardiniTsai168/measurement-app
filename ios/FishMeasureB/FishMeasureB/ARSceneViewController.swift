//
//  ARSceneViewController.swift
//  FishMeasureB
//

import UIKit
import ARKit
import RealityKit
import Combine

protocol ARSceneViewControllerDelegate: AnyObject {
    func didUpdatePlaneDetected(_ detected: Bool)
    func didRequestHeadPlacement()
    func didRequestTailPlacement()
    func didCompleteMeasurement(distanceMeters: Float)
    func didEncounterError(_ error: Error)
}

class ARSceneViewController: UIViewController {
    weak var delegate: ARSceneViewControllerDelegate?
    
    var arView: ARView!
    var measurementManager: MeasurementManager!
    
    // Plane detection state
    @Published var isPlaneDetected = false
    private var planeEntities: [UUID: AnchorEntity] = [:]
    
    // Measurement state
    private var currentStep: MeasurementStep = .detectPlane
    private var headEntity: ModelEntity?
    private var tailEntity: ModelEntity?
    private var lineEntity: ModelEntity?
    
    enum MeasurementStep {
        case detectPlane
        case placeHead
        case placeTail
        case done
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupARView()
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        startARSession()
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        arView.session.pause()
    }
    
    private func setupARView() {
        arView = ARView(frame: view.bounds)
        arView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(arView)
        
        // Tap gesture for placing head/tail
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
        arView.addGestureRecognizer(tapGesture)
    }
    
    private func startARSession() {
        let config = ARWorldTrackingConfiguration()
        config.planeDetection = [.horizontal]
        
        // Enable scene depth if available (LiDAR)
        if ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) {
            config.frameSemantics = .sceneDepth
        }
        
        arView.session.delegate = self
        arView.session.run(config)
    }
    
    // MARK: - User Interactions
    
    @objc private func handleTap(_ gesture: UITapGestureRecognizer) {
        let location = gesture.location(in: arView)
        
        switch currentStep {
        case .detectPlane:
            // Ignore taps until plane detected, or try raycast anyway
            break
        case .placeHead:
            if let pos = raycastToPlane(at: location) {
                placeHead(at: pos)
                currentStep = .placeTail
                delegate?.didRequestTailPlacement()
            }
        case .placeTail:
            if let pos = raycastToPlane(at: location) {
                placeTail(at: pos)
                currentStep = .done
                measurementManager.updateMeasurement()
                if measurementManager.canMeasure {
                    delegate?.didCompleteMeasurement(distanceMeters: measurementManager.distanceMeters)
                    drawMeasurementLine()
                }
            }
        case .done:
            // Do nothing, wait for reset
            break
        }
    }
    
    func resetMeasurement() {
        currentStep = .placeHead
        if let head = headEntity { head.removeFromParent() }
        if let tail = tailEntity { tail.removeFromParent() }
        if let line = lineEntity { line.removeFromParent() }
        headEntity = nil
        tailEntity = nil
        lineEntity = nil
        measurementManager.reset()
        // Clear anchors from session
        arView.scene.anchors.removeAll()
        if let headA = measurementManager.headAnchor {
            arView.session.remove(anchor: headA)
        }
        if let tailA = measurementManager.tailAnchor {
            arView.session.remove(anchor: tailA)
        }
        delegate?.didRequestHeadPlacement()
    }
    
    // MARK: - Raycasting
    
    private func raycastToPlane(at screenPoint: CGPoint) -> SIMD3<Float>? {
        // First try raycast against detected planes
        let results = arView.raycast(from: screenPoint, allowing: .existingPlaneGeometry, alignment: .horizontal)
        if let first = results.first {
            return first.worldTransform.columns.3.xyz
        }
        
        // Fallback: estimate using scene depth or center projection
        // For non-LiDAR devices, we use ARRaycastQuery against estimated plane
        let query = ARRaycastQuery(origin: arView.cameraTransform.translation,
                                    direction: arView.cameraTransform.matrix.forward,
                                    allowing: .estimatedPlane,
                                    alignment: .horizontal)
        let estimated = arView.session.raycast(query)
        if let first = estimated.first {
            return first.worldTransform.columns.3.xyz
        }
        
        return nil
    }
    
    func smartRaycastAgainstObject(at screenPoint: CGPoint) -> SIMD3<Float>? {
        // LiDAR depth-based hit test (preferred)
        if let depthResult = depthRaycast(at: screenPoint) {
            return depthResult
        }
        return raycastToPlane(at: screenPoint)
    }
    
    private func depthRaycast(at screenPoint: CGPoint) -> SIMD3<Float>? {
        guard ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) else { return nil }
        
        // Get current frame depth
        guard let frame = arView.session.currentFrame,
              let depthMap = frame.sceneDepth?.depthMap else { return nil }
        
        // Convert screen point to depth map coordinates
        let depthSize = CGSize(width: CVPixelBufferGetWidth(depthMap), height: CVPixelBufferGetHeight(depthMap))
        let imageSize = arView.bounds.size
        let x = Int((screenPoint.x / imageSize.width) * depthSize.width)
        let y = Int((screenPoint.y / imageSize.height) * depthSize.height)
        
        guard x >= 0, x < Int(depthSize.width), y >= 0, y < Int(depthSize.height) else { return nil }
        
        CVPixelBufferLockBaseAddress(depthMap, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(depthMap, .readOnly) }
        
        guard let baseAddress = CVPixelBufferGetBaseAddress(depthMap) else { return nil }
        let bytesPerRow = CVPixelBufferGetBytesPerRow(depthMap)
        let row = baseAddress.advanced(by: y * bytesPerRow)
        let depthPointer = row.assumingMemoryBound(to: Float32.self)
        let depth = depthPointer[x]
        
        guard depth.isFinite && depth > 0 else { return nil }
        
        // Unproject screen point to 3D using camera intrinsics
        let intrinsics = frame.camera.intrinsics
        let uv = SIMD2<Float>(
            Float(screenPoint.x),
            Float(imageSize.height - screenPoint.y) // flip Y
        )
        
        let principalPoint = SIMD2<Float>(intrinsics[2, 0], intrinsics[2, 1])
        let focalLength = SIMD2<Float>(intrinsics[0, 0], intrinsics[1, 1])
        
        let xy = (uv - principalPoint) / focalLength * depth
        let localPoint = SIMD3<Float>(xy.x, xy.y, depth)
        
        // Transform to world coordinates
        var worldTransform = frame.camera.transform
        worldTransform.columns.3 = worldTransform * SIMD4<Float>(localPoint, 1)
        
        return worldTransform.columns.3.xyz
    }
    
    // MARK: - Visual Feedback
    
    private func placeHead(at position: SIMD3<Float>) {
        let anchor = AnchorEntity(world: position)
        let sphere = createSphereEntity(color: .red, radius: 0.008)
        anchor.addChild(sphere)
        arView.scene.addAnchor(anchor)
        headEntity = sphere
        measurementManager.placeHead(at: position, in: arView.session)
    }
    
    private func placeTail(at position: SIMD3<Float>) {
        let anchor = AnchorEntity(world: position)
        let sphere = createSphereEntity(color: .blue, radius: 0.008)
        anchor.addChild(sphere)
        arView.scene.addAnchor(anchor)
        tailEntity = sphere
        measurementManager.placeTail(at: position, in: arView.session)
    }
    
    private func drawMeasurementLine() {
        guard let headPos = headEntity?.position, let tailPos = tailEntity?.position else { return }
        
        let mid = (headPos + tailPos) / 2
        let length = Float(simd_distance(headPos, tailPos))
        
        // Create a cylinder line
        let mesh = MeshResource.generateBox(width: 0.003, height: 0.003, depth: length)
        let material = SimpleMaterial(color: .yellow, isMetallic: false)
        let line = ModelEntity(mesh: mesh, materials: [material])
        
        line.position = mid
        line.look(at: tailPos, from: mid, relativeTo: nil)
        
        // Add to a dedicated anchor
        let lineAnchor = AnchorEntity(world: mid)
        lineAnchor.addChild(line)
        arView.scene.addAnchor(lineAnchor)
        lineEntity = line
    }
    
    private func createSphereEntity(color: UIColor, radius: Float) -> ModelEntity {
        let mesh = MeshResource.generateSphere(radius: radius)
        let material = SimpleMaterial(color: color, isMetallic: true)
        return ModelEntity(mesh: mesh, materials: [material])
    }
    
    private func createPlaneVisualization(for anchor: ARPlaneAnchor) -> ModelEntity {
        let width = anchor.planeExtent.width
        let height = anchor.planeExtent.height
        let mesh = MeshResource.generatePlane(width: width, depth: height)
        let material = SimpleMaterial(color: UIColor.green.withAlphaComponent(0.3), isMetallic: false)
        let entity = ModelEntity(mesh: mesh, materials: [material])
        return entity
    }
}

// MARK: - ARSessionDelegate
extension ARSceneViewController: ARSessionDelegate {
    func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
        for anchor in anchors {
            if let planeAnchor = anchor as? ARPlaneAnchor {
                let entity = createPlaneVisualization(for: planeAnchor)
                let anchorEntity = AnchorEntity(world: planeAnchor.transform)
                anchorEntity.addChild(entity)
                arView.scene.addAnchor(anchorEntity)
                planeEntities[planeAnchor.identifier] = anchorEntity
                
                if !isPlaneDetected {
                    isPlaneDetected = true
                    delegate?.didUpdatePlaneDetected(true)
                    if currentStep == .detectPlane {
                        currentStep = .placeHead
                        delegate?.didRequestHeadPlacement()
                    }
                }
            }
        }
    }
    
    func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        for anchor in anchors {
            if let planeAnchor = anchor as? ARPlaneAnchor,
               let anchorEntity = planeEntities[planeAnchor.identifier] {
                anchorEntity.transform.matrix = planeAnchor.transform
                if let entity = anchorEntity.children.first as? ModelEntity {
                    let newMesh = MeshResource.generatePlane(width: planeAnchor.planeExtent.width, depth: planeAnchor.planeExtent.height)
                    entity.model?.mesh = newMesh
                    entity.position = SIMD3<Float>(planeAnchor.center.x, 0, planeAnchor.center.z)
                }
            }
        }
    }
    
    func session(_ session: ARSession, didRemove anchors: [ARAnchor]) {
        for anchor in anchors {
            if let planeAnchor = anchor as? ARPlaneAnchor,
               let anchorEntity = planeEntities.removeValue(forKey: planeAnchor.identifier) {
                anchorEntity.removeFromParent()
            }
        }
    }
    
    func session(_ session: ARSession, didFailWithError error: Error) {
        delegate?.didEncounterError(error)
    }
}

// MARK: - Camera transform helpers
extension Transform {
    var translation: SIMD3<Float> {
        return SIMD3<Float>(matrix.columns.3.x, matrix.columns.3.y, matrix.columns.3.z)
    }
}

extension simd_float4x4 {
    var forward: SIMD3<Float> {
        return -SIMD3<Float>(columns.2.x, columns.2.y, columns.2.z)
    }
}
