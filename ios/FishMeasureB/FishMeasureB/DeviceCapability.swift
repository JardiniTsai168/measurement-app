//
//  DeviceCapability.swift
//  FishMeasureB
//

import ARKit
import AVFoundation

enum DepthCapability {
    case lidar      // iPhone 12 Pro+ / iPad Pro with LiDAR
    case dualCamera // iPhone X+ dual lens
    case planeOnly  // Single camera, plane detection only
    
    var description: String {
        switch self {
        case .lidar: return "LiDAR + 深度"
        case .dualCamera: return "雙鏡頭深度"
        case .planeOnly: return "僅平面側測"
        }
    }
}

class DeviceCapability {
    static let shared = DeviceCapability()
    
    var depthCapability: DepthCapability {
        if ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) {
            return .lidar
        }
        // Dual camera depth via ARVideoFormat checks
        if #available(iOS 13.0, *),
           ARWorldTrackingConfiguration.supportsFrameSemantics(.personSegmentationWithDepth) {
            // This indicates depth-capable dual camera
            return .dualCamera
        }
        return .planeOnly
    }
    
    var supportsSceneDepth: Bool {
        return ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth)
    }
    
    var supportsPersonDepth: Bool {
        if #available(iOS 13.0, *) {
            return ARWorldTrackingConfiguration.supportsFrameSemantics(.personSegmentationWithDepth)
        }
        return false
    }
}
