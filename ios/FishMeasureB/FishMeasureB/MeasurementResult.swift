//
//  MeasurementResult.swift
//  FishMeasureB
//

import Foundation
import CoreLocation

struct FishMeasurement: Identifiable, Codable {
    let id: UUID
    let lengthMeters: Double
    let headPosition: SIMD3<Float>?
    let tailPosition: SIMD3<Float>?
    let timestamp: Date
    let location: CLLocationCoordinate2D?
    let weather: WeatherData?
    let deviceType: String
    let accuracyLevel: AccuracyLevel
    
    var lengthCm: Double { lengthMeters * 100 }
    var formattedLength: String { String(format: "%.1f cm", lengthCm) }
    
    enum AccuracyLevel: String, Codable {
        case high     // LiDAR
        case medium   // Dual-camera depth
        case low      // Plane only
        
        var label: String {
            switch self {
            case .high: return "高 (LiDAR)"
            case .medium: return "中 (雙鏡頭)"
            case .low: return "低 (平面)"
            }
        }
    }
}

struct WeatherData: Codable {
    let temperature: Double?
    let humidity: Double?
    let windSpeed: Double?
    let windDirection: Double?
    let conditionDescription: String?
}

// MARK: - CLLocationCoordinate2D Codable helpers
extension CLLocationCoordinate2D: Codable {
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let lat = try container.decode(Double.self, forKey: .latitude)
        let lon = try container.decode(Double.self, forKey: .longitude)
        self.init(latitude: lat, longitude: lon)
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(latitude, forKey: .latitude)
        try container.encode(longitude, forKey: .longitude)
    }
    
    enum CodingKeys: String, CodingKey {
        case latitude, longitude
    }
}
