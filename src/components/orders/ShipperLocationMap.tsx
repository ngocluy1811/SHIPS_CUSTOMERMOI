import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Fix marker icon path for Vite/React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import polyline from '@mapbox/polyline';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const VIETMAP_TILE_API_KEY = '7f9ef35866466886ebd24ba5091eda803732c8c76cde1b4a';
const VIETMAP_ROUTE_API = 'https://maps.vietmap.vn/api/route?api-version=1.1';
const VIETMAP_GEOCODE_API = 'https://maps.vietmap.vn/api/search';
const TRUCK_ICON_URL = '/icons/truck.png'; // icon xe tải local

interface LatLng {
    lat: number;
    lng: number;
}

interface Address {
  lat?: number;
  lng?: number;
  street?: string;
  ward?: string;
  district?: string;
  city?: string;
  [key: string]: any;
}

const DEFAULT_LOCATION = { lat: 10.762622, lng: 106.660172 };

async function geocodeAddress(address: Address): Promise<LatLng | null> {
  // Thử lần lượt: full, bỏ street, chỉ district+city, chỉ city
  const variants = [
    [address.street, address.ward, address.district, address.city],
    [address.ward, address.district, address.city],
    [address.district, address.city],
    [address.city]
  ].map(arr => arr.filter(Boolean).join(', ')).filter(Boolean);
  // Thử với Vietmap trước
  for (const text of variants) {
    if (!text) continue;
    try {
      const url = `${VIETMAP_GEOCODE_API}?apikey=${VIETMAP_TILE_API_KEY}&text=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const data = await res.json();
      console.log('[GEOCODE] Thử địa chỉ (Vietmap):', text, '=>', data);
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].geometry.coordinates;
        return { lat, lng };
      }
    } catch (e) {
      // eslint-disable-next-line
      console.error('Geocode error (Vietmap):', e);
    }
  }
  // Nếu Vietmap không ra, thử Nominatim
  for (const text of variants) {
    if (!text) continue;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const data = await res.json();
      console.log('[GEOCODE] Thử địa chỉ (Nominatim):', text, '=>', data);
      if (Array.isArray(data) && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (e) {
      // eslint-disable-next-line
      console.error('Geocode error (Nominatim):', e);
    }
  }
  return null;
}

async function getFallbackRoute(shipperPos: LatLng, destPos: LatLng): Promise<[number, number][]> {
  // Chỉ fallback ORS nếu hai điểm đều ở Việt Nam và khoảng cách hợp lý
  function isVN(lat: number, lng: number) {
    return lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110;
  }
  function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  if (!isVN(shipperPos.lat, shipperPos.lng) || !isVN(destPos.lat, destPos.lng)) return [];
  if (haversine(shipperPos.lat, shipperPos.lng, destPos.lat, destPos.lng) > 500) return [];
  const ORS_API_KEY = '5b3ce3597851110001cf6248e3e8ef34ed2b4788a48fd77f04a52ca1';
  const profiles = ['driving-hgv', 'driving-car', 'cycling-regular'];
  for (const profile of profiles) {
    const url = `https://api.openrouteservice.org/v2/directions/${profile}?api_key=${ORS_API_KEY}&start=${shipperPos.lng},${shipperPos.lat}&end=${destPos.lng},${destPos.lat}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.features && data.features[0]) {
        return data.features[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
      }
    } catch (e) {
      // eslint-disable-next-line
      console.error('ORS fallback error:', e);
    }
  }
  return [];
}

const ShipperLocationMap = ({ shipperLocation, deliveryAddress, deliveryDate, shipperPhone, onOpenChat }: { shipperLocation: LatLng | null, deliveryAddress: Address, deliveryDate?: string, shipperPhone?: string, onOpenChat?: () => void }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const isMountedRef = useRef(true); // kiểm soát trạng thái mounted
  const [routeInfo, setRouteInfo] = useState<{ distance: number, duration: number, instructions: any[] } | null>(null);
  const [destLatLng, setDestLatLng] = useState<LatLng | null>(null);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    let shipperMarker: L.Marker | null = null;
    let destMarker: L.Marker | null = null;
    let routePolyline: L.Polyline | null = null;

    // Cleanup function
    function cleanupMap() {
      if (routePolyline) {
        try { routePolyline.remove(); } catch {}
        routePolyline = null;
      }
      if (shipperMarker) {
        try { shipperMarker.remove(); } catch {}
        shipperMarker = null;
      }
      if (destMarker) {
        try { destMarker.remove(); } catch {}
        destMarker = null;
      }
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch {}
        mapInstanceRef.current = null;
      }
    }

    async function drawMap() {
      setRouteError(null);
      const shipperPos: LatLng = shipperLocation || DEFAULT_LOCATION;
      let destPos: LatLng | null = destLatLng;
      if (!destPos) {
        destPos = await geocodeAddress(deliveryAddress);
        if (!isMountedRef.current) return;
        setDestLatLng(destPos);
      }
      if (!destPos) {
        setGeocodeError('Không tìm được vị trí khách hàng từ địa chỉ!');
        return;
      } else {
        setGeocodeError(null);
      }
      // Cleanup trước khi tạo mới
      cleanupMap();
      if (!isMountedRef.current) return;
      mapInstanceRef.current = L.map(mapRef.current!).setView([shipperPos.lat, shipperPos.lng], 8);
      const tileUrl = `https://maps.vietmap.vn/api/tm/{z}/{x}/{y}@2x.png?apikey=${VIETMAP_TILE_API_KEY}`;
      L.tileLayer(tileUrl, { maxZoom: 18, attribution: '© VietMap' }).addTo(mapInstanceRef.current);
      // Marker shipper: icon xe tải local
      const truckIcon = L.icon({
        iconUrl: TRUCK_ICON_URL,
        iconSize: [48, 48],
        iconAnchor: [24, 48],
        popupAnchor: [0, -48]
      });
      shipperMarker = L.marker([shipperPos.lat, shipperPos.lng], { icon: truckIcon }).addTo(mapInstanceRef.current);
      shipperMarker.bindPopup('Vị trí shipper').openPopup();
      // Marker khách hàng
      destMarker = L.marker([destPos.lat, destPos.lng]).addTo(mapInstanceRef.current);
      destMarker.bindPopup('Khách hàng').openPopup();
      // Gọi API Vietmap để lấy route
      const url = `${VIETMAP_ROUTE_API}&apikey=${VIETMAP_TILE_API_KEY}&point=${shipperPos.lat},${shipperPos.lng}&point=${destPos.lat},${destPos.lng}&vehicle=motorcycle&points_encoded=false`;
      console.log('[ROUTE API] URL:', url);
      console.log('[ROUTE API] shipperPos:', shipperPos, 'destPos:', destPos);
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (!isMountedRef.current) return;
        console.log('[ROUTE API] response:', data);
        if (data.paths && data.paths[0]) {
          const path = data.paths[0];
          console.log('[ROUTE API] path:', path);
          console.log('[ROUTE API] path.points:', path.points);
          console.log('[ROUTE API] path.points_encoded:', path.points_encoded);
          let coordinates: [number, number][] = [];
          if (path.points && path.points.type === 'LineString' && Array.isArray(path.points.coordinates)) {
            coordinates = path.points.coordinates.map((pt: any) => {
              if (pt[0] >= 8 && pt[0] <= 24 && pt[1] >= 102 && pt[1] <= 110) {
                return [pt[0], pt[1]];
              } else if (pt[1] >= 8 && pt[1] <= 24 && pt[0] >= 102 && pt[0] <= 110) {
                return [pt[1], pt[0]];
              } else {
                return [pt[0], pt[1]];
              }
            });
          } else if (Array.isArray(path.points) && Array.isArray(path.points[0])) {
            coordinates = path.points.map((pt: any) => [pt[0], pt[1]]);
          } else if (typeof path.points === 'string') {
            coordinates = (polyline.decode(path.points) as [number, number][]).map((arr) => [arr[0], arr[1]]);
          }
          console.log('[ROUTE API] coordinates:', coordinates);
          if (coordinates.length > 0 && mapInstanceRef.current) {
            routePolyline = L.polyline(coordinates, { color: 'red', weight: 5 }).addTo(mapInstanceRef.current!);
            setTimeout(() => {
              if (isMountedRef.current && mapInstanceRef.current && routePolyline) {
                try { mapInstanceRef.current.fitBounds(routePolyline.getBounds()); } catch {}
              }
            }, 0);
            setRouteError(null);
            setRouteInfo({
              distance: path.distance,
              duration: path.time,
              instructions: path.instructions || []
            });
            return;
          }
        }
        setRouteError('Không tìm được tuyến đường thực tế giữa hai điểm này trên Vietmap.');
        setRouteInfo(null);
      } catch (e) {
        setRouteInfo(null);
        setRouteError('Lỗi khi lấy dữ liệu chỉ đường từ Vietmap!');
      }
    }
    drawMap();
    return () => {
      isMountedRef.current = false;
      cleanupMap();
    };
  }, [shipperLocation, deliveryAddress, destLatLng]);

  return (
    <div className="relative w-full h-full flex flex-col">
      {geocodeError ? (
        <div className="w-full h-96 flex items-center justify-center bg-gray-100 rounded-lg text-red-600 font-semibold text-lg">
          {geocodeError}
        </div>
      ) : (
        <>
          {/* Map */}
          <div ref={mapRef} className="w-full h-[500px] rounded-lg" />
          {/* Box thông tin tuyến đường thực tế, luôn hiển thị dưới bản đồ nếu có routeInfo */}
          {routeInfo && !routeError && (
            <div className="w-full flex flex-col items-center mt-4">
              <div className="bg-white bg-opacity-90 rounded shadow p-6 min-w-[320px] max-w-3xl w-full flex flex-col gap-3 items-center border border-orange-200">
                <div className="font-semibold text-orange-600 text-xl">Tuyến đường thực tế</div>
                <div>Khoảng cách: <b>{(routeInfo.distance / 1000).toFixed(2)} km</b></div>
                <div>
                  Thời gian dự kiến: <b>
                    {(() => {
                      const mins = Math.round(routeInfo.duration / 60000);
                      if (mins >= 1440) {
                        const days = Math.floor(mins / 1440);
                        const hours = Math.floor((mins % 1440) / 60);
                        const minutes = mins % 60;
                        let str = '';
                        if (days > 0) str += days + ' ngày ';
                        if (hours > 0) str += hours + ' giờ ';
                        if (minutes > 0) str += minutes + ' phút';
                        return str.trim();
                      }
                      return mins + ' phút';
                    })()}
                  </b>
                </div>
                {deliveryDate && (
                  <div className="text-gray-700 text-base mt-1">
                    Dự kiến tới nơi: <b className="text-blue-700">{(() => {
                      const start = new Date(deliveryDate);
                      const eta = new Date(start.getTime() + routeInfo.duration);
                      return eta.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
                    })()}</b>
                  </div>
                )}
                <button
                  className="mt-3 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-base font-medium border border-blue-300"
                  onClick={() => setShowInstructions(v => !v)}
                >
                  {showInstructions ? 'Ẩn hướng dẫn từng chặng' : 'Xem hướng dẫn từng chặng'}
                </button>
              </div>
        </div>
          )}
          {/* Hướng dẫn từng chặng xổ ra dưới box info */}
          {routeInfo && showInstructions && !routeError && (
            <div className="mt-2 bg-white rounded shadow p-4 text-sm max-h-40 overflow-y-auto max-w-3xl mx-auto">
              <div className="font-semibold text-gray-700 mb-1">Hướng dẫn từng chặng:</div>
              {routeInfo.instructions && routeInfo.instructions.length > 0 ? (
                <ol className="list-decimal ml-5">
                  {routeInfo.instructions.map((ins, i) => (
                    <li key={i}>{ins.text} ({(ins.distance/1000).toFixed(2)} km, {Math.round(ins.time/60000)} phút)</li>
                  ))}
                </ol>
              ) : (
                <div className="text-gray-500 italic">Không có hướng dẫn chi tiết cho tuyến đường này.</div>
              )}
        </div>
          )}
        </>
      )}
      {/* Nút gọi/chat luôn ở dưới cùng - chỉ render ở đây, không render ở ngoài */}
      <div className="flex gap-2 mt-4 w-full justify-center">
        <a
          href={shipperPhone ? `tel:${shipperPhone}` : undefined}
          className="flex-1"
          style={{ pointerEvents: shipperPhone ? 'auto' : 'none', opacity: shipperPhone ? 1 : 0.5 }}
        >
          <button type="button" className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a2 2 0 011.94 1.515l.516 2.064a2 2 0 01-.45 1.958l-1.27 1.27a16.001 16.001 0 006.586 6.586l1.27-1.27a2 2 0 011.958-.45l2.064.516A2 2 0 0121 18.72V21a2 2 0 01-2 2h-1C9.163 23 1 14.837 1 5V4a2 2 0 012-2z" /></svg>
            Gọi shipper
          </button>
        </a>
        <button
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded flex items-center justify-center"
          type="button"
          onClick={onOpenChat}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
          Chat với shipper
        </button>
      </div>
    </div>
  );
};

export default ShipperLocationMap;