const API_KEY = ''; // OpenWeatherMap API key (optional for MVP)
const BASE = 'https://api.openweathermap.org/data/2.5/weather';

export interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  description: string;
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  if (!API_KEY) {
    // MVP: return dummy data if no API key
    return {
      temp: 25,
      humidity: 70,
      windSpeed: 3.5,
      description: '晴朗',
    };
  }
  try {
    const url = `${BASE}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=zh_tw`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    return {
      temp: d.main?.temp ?? 0,
      humidity: d.main?.humidity ?? 0,
      windSpeed: d.wind?.speed ?? 0,
      description: d.weather?.[0]?.description ?? '',
    };
  } catch {
    return null;
  }
}
