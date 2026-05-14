//
//  WeatherService.swift
//  FishMeasureB
//

import Foundation
import CoreLocation

class WeatherService {
    private let apiKey = "YOUR_OPENWEATHER_API_KEY" // 請替換成實際 API Key
    private let session = URLSession.shared
    
    struct OpenWeatherResponse: Codable {
        struct Main: Codable {
            let temp: Double?
            let humidity: Double?
            let pressure: Double?
        }
        struct Wind: Codable {
            let speed: Double?
            let deg: Double?
        }
        struct Weather: Codable {
            let description: String?
        }
        let main: Main?
        let wind: Wind?
        let weather: [Weather]?
    }
    
    func fetchWeather(for coordinate: CLLocationCoordinate2D, completion: @escaping (WeatherData?) -> Void) {
        let urlString = "https://api.openweathermap.org/data/2.5/weather?lat=\(coordinate.latitude)&lon=\(coordinate.longitude)&appid=\(apiKey)&units=metric&lang=zh_tw"
        
        guard let url = URL(string: urlString) else {
            completion(nil)
            return
        }
        
        let task = session.dataTask(with: url) { data, response, error in
            guard let data = data, error == nil else {
                DispatchQueue.main.async { completion(nil) }
                return
            }
            
            do {
                let decoded = try JSONDecoder().decode(OpenWeatherResponse.self, from: data)
                let weather = WeatherData(
                    temperature: decoded.main?.temp,
                    humidity: decoded.main?.humidity,
                    windSpeed: decoded.wind?.speed,
                    windDirection: decoded.wind?.deg,
                    conditionDescription: decoded.weather?.first?.description
                )
                DispatchQueue.main.async { completion(weather) }
            } catch {
                DispatchQueue.main.async { completion(nil) }
            }
        }
        
        task.resume()
    }
}
