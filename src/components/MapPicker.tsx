/**
 * MapPicker.tsx
 * Interactive location picker using Leaflet + OpenStreetMap (no API key needed).
 * - Search box powered by Nominatim geocoding API (free, OSM data)
 * - Click or drag the pin to set coordinates
 * - "Use My Location" button for GPS
 */
import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Search, Loader2, Navigation, X } from "lucide-react";

// Fix Leaflet's broken default icon paths in bundler environments
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export interface MapPickerValue {
  lat: number;
  lng: number;
  displayName?: string;
}

interface MapPickerProps {
  initialLat?: number | null;
  initialLng?: number | null;
  onChange: (value: MapPickerValue) => void;
  mapClassName?: string;
}

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]; // India centre
const DEFAULT_ZOOM = 5;
const PINNED_ZOOM  = 15;

export default function MapPicker({ initialLat, initialLng, onChange, mapClassName = "h-64" }: MapPickerProps) {
  const mapRef     = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<L.Map | null>(null);
  const markerRef  = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [searching, setSearching]     = useState(false);
  const [locating, setLocating]       = useState(false);
  const [pinned, setPinned]           = useState<MapPickerValue | null>(
    initialLat != null && initialLng != null
      ? { lat: initialLat, lng: initialLng }
      : null
  );
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Move/create marker on the Leaflet map
  const placeMarker = useCallback((lat: number, lng: number, displayName?: string) => {
    if (!leafletRef.current) return;
    const map = leafletRef.current;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const pos = markerRef.current!.getLatLng();
        const val = { lat: pos.lat, lng: pos.lng };
        setPinned(val);
        onChange(val);
      });
    }
    map.setView([lat, lng], PINNED_ZOOM);
    const val = { lat, lng, displayName };
    setPinned(val);
    onChange(val);
  }, [onChange]);

  // Initialize Leaflet once
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;
    const center: [number, number] = initialLat != null && initialLng != null
      ? [initialLat, initialLng]
      : DEFAULT_CENTER;
    const zoom = initialLat != null ? PINNED_ZOOM : DEFAULT_ZOOM;
    const map = L.map(mapRef.current, { zoomControl: true }).setView(center, zoom);
    leafletRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    if (initialLat != null && initialLng != null) {
      markerRef.current = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const pos = markerRef.current!.getLatLng();
        const val = { lat: pos.lat, lng: pos.lng };
        setPinned(val);
        onChange(val);
      });
    }

    map.on("click", (e: L.LeafletMouseEvent) => {
      placeMarker(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      map.remove();
      leafletRef.current = null;
      markerRef.current  = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced Nominatim autocomplete search
  function handleSearchInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(searchTimer.current);
    if (val.length < 2) { setSuggestions([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&addressdetails=0`,
          { headers: { "Accept-Language": "en" } }
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  function selectSuggestion(item: NominatimResult) {
    setSuggestions([]);
    setSearchQuery(item.display_name);
    placeMarker(parseFloat(item.lat), parseFloat(item.lon), item.display_name);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        placeMarker(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => { setLocating(false); },
      { timeout: 10000 }
    );
  }

  function clearPin() {
    if (markerRef.current && leafletRef.current) {
      leafletRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    setPinned(null);
    setSearchQuery("");
    setSuggestions([]);
    // Notify parent with nullified value — parent should handle clearing
    onChange({ lat: 0, lng: 0, displayName: "" });
  }

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <div className="flex items-center gap-2 input-luxe rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-text-dim shrink-0" />
          <input
            type="text"
            placeholder="Search for a place..."
            value={searchQuery}
            onChange={handleSearchInput}
            className="flex-1 bg-transparent outline-none text-sm text-text placeholder:text-text-dim"
            autoComplete="off"
          />
          {searching && <Loader2 className="w-3.5 h-3.5 text-text-dim animate-spin shrink-0" />}
          {searchQuery && !searching && (
            <button type="button" onClick={() => { setSearchQuery(""); setSuggestions([]); }} title="Clear search" className="tap-active">
              <X className="w-3.5 h-3.5 text-text-dim" />
            </button>
          )}
        </div>
        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute z-[9999] top-full left-0 right-0 mt-1 glass-panel rounded-xl shadow-2xl overflow-hidden border border-border">
            {suggestions.map((item) => (
              <button
                key={item.place_id}
                type="button"
                onClick={() => selectSuggestion(item)}
                className="w-full text-left px-4 py-3 hover:bg-primary/8 transition flex items-start gap-2.5 border-b border-border/50 last:border-0"
              >
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span className="text-xs text-text leading-relaxed line-clamp-2">{item.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map container — height controlled via mapClassName prop */}
      <div
        ref={mapRef}
        className={`rounded-2xl overflow-hidden border border-border w-full relative ${mapClassName}`}
      />

      {/* Action row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary/20 bg-primary/5 text-primary text-xs font-semibold hover:bg-primary/10 transition tap-active disabled:opacity-50"
        >
          {locating
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Detecting...</>
            : <><Navigation className="w-3.5 h-3.5" />Use My Location</>}
        </button>
        {pinned && pinned.lat !== 0 && (
          <button
            type="button"
            onClick={clearPin}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-error/20 bg-error/5 text-error text-xs font-semibold hover:bg-error/10 transition tap-active"
            title="Remove pin"
          >
            <X className="w-3.5 h-3.5" /> Remove Pin
          </button>
        )}
      </div>

      {/* Pinned label */}
      {pinned && pinned.lat !== 0 && (
        <div className="flex items-center gap-2 text-success text-xs font-semibold">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{pinned.displayName || `${pinned.lat.toFixed(5)}, ${pinned.lng.toFixed(5)}`}</span>
        </div>
      )}

      <p className="text-[10px] text-text-dim leading-relaxed">
        Click on the map, drag the pin, or search for a place. Tap "Use My Location" to use GPS.
      </p>
    </div>
  );
}
