//
//  ARMeasurementView.swift
//  FishMeasureB
//

import SwiftUI

struct ARMeasurementView: UIViewControllerRepresentable {
    @ObservedObject var measurementManager: MeasurementManager
    @Binding var isPlaneReady: Bool
    @Binding var instructionText: String
    @Binding var showResult: Bool
    @Binding var measurementResult: FishMeasurement?
    @Binding var shouldResetAR: Bool
    
    let locationManager: LocationManager
    let weatherService: WeatherService
    
    func makeUIViewController(context: Context) -> ARSceneViewController {
        let controller = ARSceneViewController()
        controller.measurementManager = measurementManager
        controller.delegate = context.coordinator
        context.coordinator.controller = controller
        return controller
    }
    
    func updateUIViewController(_ uiViewController: ARSceneViewController, context: Context) {
        if shouldResetAR {
            uiViewController.resetMeasurement()
            DispatchQueue.main.async {
                shouldResetAR = false
            }
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, ARSceneViewControllerDelegate {
        var parent: ARMeasurementView
        weak var controller: ARSceneViewController?
        
        init(_ parent: ARMeasurementView) {
            self.parent = parent
        }
        
        func didUpdatePlaneDetected(_ detected: Bool) {
            DispatchQueue.main.async {
                self.parent.isPlaneReady = detected
                if detected {
                    self.parent.instructionText = "平面側測到了！請點擊魚頭"
                }
            }
        }
        
        func didRequestHeadPlacement() {
            DispatchQueue.main.async {
                self.parent.instructionText = "請點擊畫面上的魚頭位置"
            }
        }
        
        func didRequestTailPlacement() {
            DispatchQueue.main.async {
                self.parent.instructionText = "請點擊畫面上的尾鰽位置"
            }
        }
        
        func didCompleteMeasurement(distanceMeters: Float) {
            DispatchQueue.main.async {
                let weather = self.parent.measurementResult?.weather
                let location = self.parent.locationManager.location?.coordinate
                let device = DeviceCapability.shared.depthCapability
                
                self.parent.measurementResult = self.parent.measurementManager.currentResult(
                    deviceType: device,
                    location: location,
                    weather: weather
                )
                self.parent.showResult = true
                self.parent.instructionText = "量測完成！"
            }
        }
        
        func didEncounterError(_ error: Error) {
            DispatchQueue.main.async {
                self.parent.instructionText = "錯誤: \(error.localizedDescription)"
            }
        }
    }
}
