//
//  MeasurementManager.swift
//  FishMeasureB
//

import ARKit
import RealityKit
import Combine

class MeasurementManager: ObservableObject {
    @Published var headAnchor: ARAnchor?
    @Published var tailAnchor: ARAnchor?
    @Published var measurementLine: Entity?
    @Published var distanceMeters: Float = 0
    @Published var isHeadPlaced = false
    @Published var isTailPlaced = false
    @Published var canMeasure: Bool = false
    
    private var cancellables = Set<AnyCancellable>()
    
    func placeHead(at position: SIMD3<Float>, in session: ARSession) {
        // Remove existing head anchor
        if let existing = headAnchor {
            session.remove(anchor: existing)
        }
        let anchor = ARAnchor(name: "head", transform: simd_float4x4(translation: position))
        session.add(anchor: anchor)
        headAnchor = anchor
        isHeadPlaced = true
        updateMeasurement()
    }
    
    func placeTail(at position: SIMD3<Float>, in session: ARSession) {
        if let existing = tailAnchor {
            session.remove(anchor: existing)
        }
        let anchor = ARAnchor(name: "tail", transform: simd_float4x4(translation: position))
        session.add(anchor: anchor)
        tailAnchor = anchor
        isTailPlaced = true
        updateMeasurement()
    }
    
    func reset() {
        distanceMeters = 0
        isHeadPlaced = false
        isTailPlaced = false
        canMeasure = false
        // Anchors removed by caller with session
        headAnchor = nil
        tailAnchor = nil
    }
    
    func updateMeasurement() {
        guard let h = headAnchor, let t = tailAnchor else {
            canMeasure = false
            return
        }
        let diff = simd_distance(h.transform.columns.3.xyz, t.transform.columns.3.xyz)
        distanceMeters = diff
        canMeasure = true
    }
    
    func currentResult(deviceType: DepthCapability, location: CLLocationCoordinate2D?, weather: WeatherData?) -> FishMeasurement {
        let accuracy: FishMeasurement.AccuracyLevel
        switch deviceType {
        case .lidar: accuracy = .high
        case .dualCamera: accuracy = .medium
        case .planeOnly: accuracy = .low
        }
        
        return FishMeasurement(
            id: UUID(),
            lengthMeters: Double(distanceMeters),
            headPosition: headAnchor?.transform.columns.3.xyz,
            tailPosition: tailAnchor?.transform.columns.3.xyz,
            timestamp: Date(),
            location: location,
            weather: weather,
            deviceType: deviceType.description,
            accuracyLevel: accuracy
        )
    }
}

// MARK: - Helpers
extension simd_float4x4 {
    init(translation: SIMD3<Float>) {
        self = matrix_identity_float4x4
        self.columns.3.x = translation.x
        self.columns.3.y = translation.y
        self.columns.3.z = translation.z
    }
}

extension simd_float4 {
    var xyz: SIMD3<Float> {
        return SIMD3<Float>(x, y, z)
    }
}
