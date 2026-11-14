import { useState, useRef, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";

function App() {
  const [city, setCity] = useState<string>("");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [recentSearch, setRecentSearch] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  interface Weather {
    city: string;
    country: string;

    current: {
      temperature_2m: number;
      relative_humidity_2m: number;
      apparent_temperature: number;
      weather_code: number;
      wind_speed_10m: number;
    };

    daily: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: (number | null)[];
    };
  }

  const convertTemp = (temp: number) => {
    return unit === "C"
      ? temp
      : (temp * 9) / 5 + 32;
  };

  const getLocation = () => {
    setLoading(true)
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5`
        );

        const data = await response.json();


        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        );

        const geoData = await geoResponse.json();

        const cityName = geoData.address.city;
        const country = geoData.address.country || "";

        setRecentSearch((prev) =>
          [cityName, ...prev.filter((item) => item !== cityName)]
        )

        setWeather({
          city: cityName,
          country: country,
          current: data.current,
          daily: data.daily,
        });

      } catch {
        setLoading(false)
        toast.error("Unable to fetch weather");
      } finally {
        setLoading(false);
      }
    });
  };

  const getWeather = async (searchCity = city) => {
    if (!searchCity.trim()) {
      return toast.error("Please enter the city name")
    }

    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setWeather(null);

      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchCity)}&count=1&language=en&format=json`,
        { signal: controller.signal, }
      );

      if (!geoResponse.ok) {
        return toast.error("Unable to search city");
      }

      const geoData = await geoResponse.json();

      if (!geoData.results?.length) {
        return toast.error("City not found");
      }

      const { latitude, longitude, name, country } =
        geoData.results[0];

      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5`,
        {
          signal: controller.signal,
        }
      );

      if (!weatherResponse.ok) {
        return toast.error("Unable to fetch weather");
      }

      const weatherData = await weatherResponse.json();

      setRecentSearch((prev) =>
        [name, ...prev.filter((item) => item !== name)]
      )

      setWeather({
        city: name,
        country,
        current: weatherData.current,
        daily: weatherData.daily,
      });

    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        toast.error(error.message);
      }
    }
    finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
        setCity("");
        abortControllerRef.current = null;
      }
    }
  };

  useEffect(() => {
  return () => {
    abortControllerRef.current?.abort();
  };
}, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6 select-none">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="mx-auto max-w-3xl">

        <h1 className="mb-6 text-center text-3xl font-bold">
          Weather App
        </h1>

        <div className="flex gap-2">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Search city..."
            className="w-full rounded-lg border bg-white p-3"
          />

          <button
            onClick={() => getWeather(city)}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 text-white"
          >
            {loading ? "Loading..." : "Search"}
          </button>
          <button onClick={getLocation} className="rounded-lg bg-green-600 px-5 text-white">
            Use My Location
          </button>
        </div>

        <div className="mt-4 flex gap-2 justify-center">
          <button
            onClick={() => setUnit("C")}
            className={`rounded-lg px-6 py-4 ${unit === "C"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700"
              }`}
          >
            °C
          </button>

          <button
            onClick={() => setUnit("F")}
            className={`rounded-lg px-6 py-4 ${unit === "F"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700"
              }`}
          >
            °F
          </button>
        </div>

        {
          loading &&
          <div className="flex items-center justify-center gap-2 mt-10">
            <span className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" />
            <span className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        }

        {recentSearch.length > 0 && (
          <div className="mt-6 rounded-xl bg-white p-4 shadow">

            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                Recent Searches
              </h2>

              <button
                onClick={() => setRecentSearch([])}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Clear All
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {recentSearch.map((item) => (
                <button
                  key={item}
                  onClick={() => getWeather(item)}
                  disabled={loading}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-sm
          hover:bg-blue-100 hover:text-blue-600
          disabled:opacity-50"
                >
                  📍 {item}
                </button>
              ))}
            </div>

          </div>
        )}

        {weather && (
          <div className="mt-6 rounded-xl bg-white p-6 shadow">

            <h2 className="text-2xl font-bold">
              {weather.city}, {weather.country}
            </h2>

            <p className="mt-4 text-5xl font-bold text-blue-600">
              {convertTemp(weather.current.temperature_2m).toFixed(1)}°{unit}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <p>
                Feels like: {convertTemp(weather.current.apparent_temperature).toFixed(1)}°{unit}
              </p>

              <p>
                Humidity: {weather.current.relative_humidity_2m}%
              </p>

              <p>
                Wind: {weather.current.wind_speed_10m} km/h
              </p>

              <p>
                Weather code: {weather.current.weather_code}
              </p>
            </div>
          </div>
        )}

        {weather && (
          <div className="mt-6">
            <h2 className="mb-4 text-xl font-bold">
              5-Day Forecast
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              {weather.daily.time.map((day, index) => (
                <div
                  key={day}
                  className="rounded-xl bg-white p-4 text-center shadow"
                >
                  <p className="font-semibold">{day}</p>

                  <p className="mt-3 text-lg font-bold">
                    {convertTemp(weather.daily.temperature_2m_max[index]).toFixed(1)}°
                  </p>

                  <p className="text-gray-500">
                    {convertTemp(weather.daily.temperature_2m_min[index]).toFixed(1)}°
                  </p>

                  <p className="mt-2 text-sm">
                    Rain: {weather.daily.precipitation_probability_max[index] ?? "N/A"}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
