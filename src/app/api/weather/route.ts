import { NextResponse } from "next/server";

export async function GET() {
  try {
    const geoRes = await fetch(
      "https://geocoding-api.open-meteo.com/v1/search?name=Ulsan&count=1&language=ko&format=json",
      { cache: "no-store" },
    );
    const geo = await geoRes.json();
    const loc = geo?.results?.[0];
    if (!loc) throw new Error("location not found");

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,apparent_temperature,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul&forecast_days=1`,
      { cache: "no-store" },
    );
    const weather = await weatherRes.json();

    return NextResponse.json({
      city: loc.name,
      currentTemp: weather.current?.temperature_2m,
      apparentTemp: weather.current?.apparent_temperature,
      weatherCode: weather.current?.weather_code,
      maxTemp: weather.daily?.temperature_2m_max?.[0],
      minTemp: weather.daily?.temperature_2m_min?.[0],
    });
  } catch {
    return NextResponse.json({ error: "weather fetch failed" }, { status: 500 });
  }
}
