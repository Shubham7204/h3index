import { useState, useEffect } from "react";
import DeckGL from "@deck.gl/react";
import { PolygonLayer } from "@deck.gl/layers";
import { Map } from "react-map-gl";
import * as h3 from "h3-js";
import 'maplibre-gl/dist/maplibre-gl.css';

// Kepler.gl's classic viridis-like color palette for H3 visualizations
const getKeplerColor = (normalized: number): [number, number, number, number] => {
  // Kepler.gl uses a smooth viridis-inspired gradient
  // Dark purple/blue -> Teal -> Yellow/Green -> Bright Yellow

  if (normalized <= 0.25) {
    // Dark purple to dark blue
    const t = normalized / 0.25;
    return [
      Math.round(68 + (59 - 68) * t),    // R: 68 -> 59
      Math.round(1 + (82 - 1) * t),      // G: 1 -> 82  
      Math.round(84 + (139 - 84) * t),   // B: 84 -> 139
      200
    ];
  } else if (normalized <= 0.5) {
    // Dark blue to teal
    const t = (normalized - 0.25) / 0.25;
    return [
      Math.round(59 + (33 - 59) * t),    // R: 59 -> 33
      Math.round(82 + (144 - 82) * t),   // G: 82 -> 144
      Math.round(139 + (140 - 139) * t), // B: 139 -> 140
      200
    ];
  } else if (normalized <= 0.75) {
    // Teal to yellow-green
    const t = (normalized - 0.5) / 0.25;
    return [
      Math.round(33 + (94 - 33) * t),    // R: 33 -> 94
      Math.round(144 + (201 - 144) * t), // G: 144 -> 201
      Math.round(140 + (98 - 140) * t),  // B: 140 -> 98
      200
    ];
  } else {
    // Yellow-green to bright yellow
    const t = (normalized - 0.75) / 0.25;
    return [
      Math.round(94 + (253 - 94) * t),   // R: 94 -> 253
      Math.round(201 + (231 - 201) * t), // G: 201 -> 231
      Math.round(98 + (37 - 98) * t),    // B: 98 -> 37
      200
    ];
  }
};

// Function to load and parse CSV data
const loadCSVData = async () => {
  try {
    const response = await fetch('/src/assets/new_prosmumbai.csv');
    const csvText = await response.text();

    const lines = csvText.split('\n');

    const data = lines.slice(1)
      .filter(line => line.trim() !== '')
      .map(line => {
        const values = line.split(',');
        return {
          city: values[0],
          locality: values[1],
          h3index: values[2],
          poiCode: values[3],
          val_trans: parseFloat(values[4])
        };
      })
      .filter(item => item.h3index && !isNaN(item.val_trans));

    return data;
  } catch (error) {
    console.error('Error loading CSV data:', error);
    return [];
  }
};

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataRange, setDataRange] = useState({ min: 0, max: 0 });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const csvData = await loadCSVData();
      setData(csvData);

      if (csvData.length > 0) {
        const values = csvData.map(d => d.val_trans);
        const min = Math.min(...values);
        const max = Math.max(...values);
        setDataRange({ min, max });
      }

      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
        <div className="text-xl text-white">Loading Mumbai H3 data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
        <div className="text-xl text-red-400">Error loading data</div>
      </div>
    );
  }

  // Get center from loaded data
  const center = h3.cellToLatLng(data[0].h3index);

  const hexLayer = new PolygonLayer({
    id: "mumbai-h3-layer",
    data,
    getPolygon: (d) => h3.cellToBoundary(d.h3index, true),
    getFillColor: (d) => {
      const v = d.val_trans;
      const normalized = (v - dataRange.min) / (dataRange.max - dataRange.min);
      return getKeplerColor(normalized);
    },
    getElevation: 0,
    extruded: false,
    stroked: true,
    getLineColor: [255, 255, 255, 80], // Very subtle white borders like Kepler
    lineWidthMinPixels: 0.5, // Thinner borders like Kepler
    pickable: true,
    updateTriggers: {
      getFillColor: [dataRange.min, dataRange.max]
    }
  });

  return (
    <div className="h-screen w-screen relative">
      {/* Kepler-style info panel */}
      {/* <div
  className="absolute top-4 left-4 z-10 bg-white text-black p-5 rounded-lg shadow-lg max-w-xs"
  style={{
    border: "1px solid #eee",
    fontFamily: "inherit",
    backgroundColor: "white", // fallback if Tailwind not applied
    color: "black"            // fallback if Tailwind not applied
  }}
>
  <h3 className="font-bold text-lg mb-2">Mumbai H3 Analysis</h3>
  <div className="text-sm space-y-1">
    <div>Data Points: <span className="text-blue-700 font-semibold">{data.length}</span></div>
    <div>Range: <span className="text-blue-700 font-semibold">{dataRange.min.toFixed(2)} - {dataRange.max.toFixed(2)}</span></div>
    <div className="mt-3">
      <div className="text-xs text-gray-600 mb-1">Value Scale:</div>
      <div
        className="h-3 rounded"
        style={{
          background: 'linear-gradient(to right, rgb(68,1,84), rgb(59,82,139), rgb(33,144,140), rgb(94,201,98), rgb(253,231,37))'
        }}
      ></div>
      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
    <div className="mt-2 text-xs text-gray-500">H3</div>
  </div>
</div> */}


      <DeckGL
        initialViewState={{
          longitude: center[1],
          latitude: center[0],
          zoom: 12,
          pitch: 0, // Flat like Kepler
          bearing: 0,
        }}
        controller={true}
        layers={[hexLayer]}
        getTooltip={({ object }: { object: any }) =>
          object && {
            html: `<div style="
              background: rgba(42, 42, 42, 0.95); 
              color: white; 
              padding: 12px; 
              border-radius: 8px; 
              font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              border: 1px solid rgba(255,255,255,0.1);
            ">
              <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #fff;">
                ${object.locality}, ${object.city}
              </div>
              <div style="font-size: 12px; color: #e0e0e0; line-height: 1.4;">
                <div><strong>Value:</strong> <span style="color: #ffd700;">${object.val_trans.toFixed(3)}</span></div>
                <div><strong>POI Code:</strong> ${object.poiCode}</div>
                <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1);">
                  <div style="font-size: 10px; color: #999; font-family: monospace;">
                    H3: ${object.h3index}
                  </div>
                </div>
              </div>
            </div>`,
            style: {
              fontSize: '12px',
              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
            }
          }
        }
      >
        <Map
          reuseMaps
          mapLib={import("maplibre-gl")}
          // Dark theme like Kepler.gl
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json"
        />
      </DeckGL>

      {/* Kepler-style attribution */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-black bg-opacity-50 px-2 py-1 rounded">
      </div>
    </div>
  );
}