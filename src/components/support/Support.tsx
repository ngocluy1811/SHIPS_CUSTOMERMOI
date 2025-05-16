import React, { useState, useEffect, useRef } from 'react';
import { MessageCircleIcon, PhoneIcon, MailIcon, BookOpenIcon, HelpCircleIcon, NavigationIcon } from 'lucide-react';
import AIChatBox from '../chat/AIChatBox';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import polyline from '@mapbox/polyline';

const guides = [
  {
    title: 'Hướng dẫn tạo đơn hàng',
    path: '/orders/new',
    detail: 'Để tạo đơn hàng, bạn vào mục "Tạo đơn vận" ở menu bên trái hoặc nhấn vào đây. Sau đó điền đầy đủ thông tin người gửi, người nhận, địa chỉ, loại hàng, dịch vụ vận chuyển và nhấn "Tạo đơn hàng". Đơn hàng sẽ xuất hiện trong mục "Đơn hàng" để bạn theo dõi.'
  },
  {
    title: 'Cách tính phí vận chuyển',
    path: '/support',
    detail: 'Phí vận chuyển được tính dựa trên trọng lượng, kích thước, khoảng cách và loại dịch vụ bạn chọn. Bạn có thể xem chi tiết phí khi tạo đơn hàng hoặc liên hệ hotline để được tư vấn.'
  },
  {
    title: 'Chính sách đổi trả',
    path: '/support',
    detail: 'Chính sách đổi trả áp dụng cho các trường hợp hàng hóa bị lỗi, hư hỏng do vận chuyển. Vui lòng liên hệ hotline hoặc email để được hỗ trợ.'
  },
  {
    title: 'Quy định về hàng hóa cấm gửi',
    path: '/support',
    detail: 'Các mặt hàng cấm gửi bao gồm: chất cấm, vũ khí, động vật sống, hàng dễ cháy nổ, hàng hóa vi phạm pháp luật... Vui lòng tham khảo danh sách chi tiết trên website hoặc liên hệ hỗ trợ.'
  }
];

const VIETMAP_TILE_API_KEY = '7f9ef35866466886ebd24ba5091eda803732c8c76cde1b4a';

// Thêm dữ liệu các kho
const warehouses = [
  { name: 'Kho Hà Nội', lat: 21.028511, lng: 105.804817 },
  { name: 'Kho Đà Nẵng', lat: 16.054407, lng: 108.202167 },
  { name: 'Kho Hồ Chí Minh', lat: 10.762622, lng: 106.660172 }
];

// Interface cho response từ Vietmap Route API
interface VietmapRouteResponse {
  code: string;
  paths: Array<{
    distance: number;
    time: number;
    points: string;
    instructions: Array<{
      distance: number;
      text: string;
      time: number;
      street_name: string;
      sign: number;
    }>;
  }>;
}

// Interface cho response từ Vietmap Match-tolls API
interface VietmapMatchTollsResponse {
  distance: number;
  tolls: Array<{
    id: number;
    name: string;
    address: string;
    type: string;
    price: number;
    prices: any;
  }>;
  path: [number, number][];
}

// Interface cho response từ Vietmap TSP API
interface VietmapTSPResponse {
  license: string;
  code: string;
  messages: null;
  paths: Array<{
    distance: number;
    weight: number;
    time: number;
    transfers: number;
    points_encoded: boolean;
    bbox: [number, number, number, number];
    points: string;
    instructions: Array<{
      distance: number;
      heading: number;
      sign: number;
      interval: [number, number];
      text: string;
      time: number;
      street_name: string;
      last_heading: null;
    }>;
    snapped_waypoints: string;
  }>;
}

// Interface cho response từ Vietmap VRP API
interface VietmapVRPResponse {
  code: number;
  summary: {
    cost: number;
    unassigned: number;
    service: number;
    duration: number;
    waiting_time: number;
    priority: number;
    distance: number;
    computing_times: {
      loading: number;
      solving: number;
      routing: number;
    };
  };
  unassigned: any[];
  routes: Array<{
    vehicle: number;
    cost: number;
    service: number;
    duration: number;
    waiting_time: number;
    priority: number;
    distance: number;
    steps: Array<{
      type: string;
      location?: [number, number];
      id?: number;
      service?: number;
      waiting_time?: number;
      arrival: number;
      duration: number;
      distance: number;
    }>;
    geometry: string;
  }>;
}

// Interface cho response từ Vietmap Matrix API
interface VietmapMatrixResponse {
  code: string;
  messages: string | null;
  durations?: number[][];
  distances?: number[][];
}

// Interface cho response từ Vietmap Geofencing API
interface VietmapGeofencingResponse {
  code: any;
  message: any;
  data: Array<{
    id: string;
    inside: boolean;
  }>;
}

// Interface cho response từ Vietmap Autocomplete API
interface VietmapAutocompleteItem {
  ref_id: string;
  address: string;
  name: string;
  display: string;
  boundaries: any[];
  categories: any[];
  entry_points: Array<{ lat?: number; lng?: number }>;
}

const Support = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [modalGuide, setModalGuide] = useState<null | { title: string; detail: string }>(null);
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const [customerPos, setCustomerPos] = useState<{lat: number, lng: number} | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<typeof warehouses[0] | null>(null);
  const [routeLayer, setRouteLayer] = useState<L.Polyline | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: number, duration: number } | null>(null);
  const [routeInstructions, setRouteInstructions] = useState<any[]>([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const [isMapFull, setIsMapFull] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);
  const trafficLayerRef = useRef<L.TileLayer | null>(null);

  const mapInstance = useRef<L.Map | null>(null);

  // Thay vì xóa toàn bộ marker/polyline mỗi lần render, dùng ref để quản lý marker và polyline
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const warehouseMarkersRef = useRef<L.Marker[]>([]);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMarker, setSearchMarker] = useState<L.Marker | null>(null);

  const [reverseMarker, setReverseMarker] = useState<L.Marker | null>(null);

  const [destination, setDestination] = useState<{lat: number, lng: number, name?: string} | null>(null);

  const [batchCoords, setBatchCoords] = useState<{lat: number, lng: number}[]>([]);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const [tollsCoords, setTollsCoords] = useState<[number, number][]>([]);
  const [tollsVehicle, setTollsVehicle] = useState(1);
  const [tollsResult, setTollsResult] = useState<any>(null);
  const [tollsLoading, setTollsLoading] = useState(false);

  const [matchTollsCoords, setMatchTollsCoords] = useState<[number, number][]>([]);
  const [matchTollsVehicle, setMatchTollsVehicle] = useState(1);
  const [matchTollsResult, setMatchTollsResult] = useState<any>(null);
  const [matchTollsLoading, setMatchTollsLoading] = useState(false);
  const [matchTollsPath, setMatchTollsPath] = useState<L.Polyline | null>(null);

  const [tspPoints, setTspPoints] = useState<[number, number][]>([]);
  const [tspVehicle, setTspVehicle] = useState('car');
  const [tspRoundtrip, setTspRoundtrip] = useState(true);
  const [tspSources, setTspSources] = useState('any');
  const [tspDestinations, setTspDestinations] = useState('any');
  const [tspResult, setTspResult] = useState<VietmapTSPResponse | null>(null);
  const [tspLoading, setTspLoading] = useState(false);
  const [tspPath, setTspPath] = useState<L.Polyline | null>(null);
  const [tspMarkers, setTspMarkers] = useState<L.Marker[]>([]);

  const [vrpVehicles, setVrpVehicles] = useState<any[]>([]);
  const [vrpJobs, setVrpJobs] = useState<any[]>([]);
  const [vrpResult, setVrpResult] = useState<VietmapVRPResponse | null>(null);
  const [vrpLoading, setVrpLoading] = useState(false);
  const [vrpPaths, setVrpPaths] = useState<L.Polyline[]>([]);
  const [vrpMarkers, setVrpMarkers] = useState<L.Marker[]>([]);

  const [matrixPoints, setMatrixPoints] = useState<[number, number][]>([]);
  const [matrixVehicle, setMatrixVehicle] = useState('car');
  const [matrixSources, setMatrixSources] = useState('all');
  const [matrixDestinations, setMatrixDestinations] = useState('all');
  const [matrixAnnotation, setMatrixAnnotation] = useState<'duration' | 'distance'>('duration');
  const [matrixResult, setMatrixResult] = useState<VietmapMatrixResponse | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixError, setMatrixError] = useState<string | null>(null);

  const [geoCenters, setGeoCenters] = useState<{id: string, lat: number, lng: number}[]>([]);
  const [geoRadius, setGeoRadius] = useState(100);
  const [geoResult, setGeoResult] = useState<VietmapGeofencingResponse | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoCircle, setGeoCircle] = useState<L.Circle | null>(null);
  const [geoMarkers, setGeoMarkers] = useState<L.Marker[]>([]);

  const [autoText, setAutoText] = useState('');
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoResults, setAutoResults] = useState<VietmapAutocompleteItem[]>([]);
  const [autoMarker, setAutoMarker] = useState<L.Marker | null>(null);
  const [autoDropdown, setAutoDropdown] = useState(false);

  const handleGuideClick = (guide: typeof guides[0]) => {
    if (guide.path && guide.path !== '/support') {
      navigate(guide.path);
    } else {
      setModalGuide(guide);
    }
  };

  // Lấy vị trí khách hàng
  useEffect(() => {
    if (!customerPos) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCustomerPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCustomerPos({ lat: 10.762622, lng: 106.660172 }) // fallback HCM
      );
    }
  }, [customerPos]);

  // Hàm lấy đường đi từ Vietmap Route API
  const getRoute = async (start: {lat: number, lng: number}, end: {lat: number, lng: number}) => {
    try {
      setIsLoading(true);
      const response = await axios.get<VietmapRouteResponse>('https://maps.vietmap.vn/api/route', {
        params: {
          'api-version': '1.1',
          apikey: VIETMAP_TILE_API_KEY,
          point: [`${start.lat},${start.lng}`, `${end.lat},${end.lng}`],
          vehicle: 'car',
          points_encoded: true
        },
        paramsSerializer: params => {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach(v => searchParams.append(key, v));
            } else {
              searchParams.append(key, value as string);
            }
          });
          return searchParams.toString();
        }
      });

      if (response.data?.paths?.[0]) {
        const path = response.data.paths[0];
        // Decode polyline (chuẩn là [lat, lng])
        const coordinates = polyline.decode(path.points).map(
          ([lat, lng]: [number, number]) => L.latLng(lat, lng)
        );
        setRouteInfo({
          distance: path.distance,
          duration: path.time
        });
        setRouteInstructions(Array.isArray(path.instructions) ? path.instructions : []);
        return coordinates;
      }
      return null;
    } catch (error) {
      console.error('Error getting route:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Khởi tạo map chỉ 1 lần duy nhất và thêm sự kiện click để reverse geocode
  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([10.762622, 106.660172], 6);
      const tileUrl = `https://maps.vietmap.vn/api/tm/{z}/{x}/{y}@2x.png?apikey=${VIETMAP_TILE_API_KEY}`;
      L.tileLayer(tileUrl, {
        maxZoom: 18,
        attribution: '© VietMap'
      }).addTo(mapInstance.current);

      // Thêm sự kiện click để reverse geocode
      mapInstance.current.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;
        try {
          const res = await axios.get('https://maps.vietmap.vn/api/reverse/v3', {
            params: {
              apikey: VIETMAP_TILE_API_KEY,
              lat,
              lng
            }
          });
          if (res.data && Array.isArray(res.data) && res.data[0]) {
            const place = res.data[0];
            if (reverseMarker) mapInstance.current?.removeLayer(reverseMarker);
            const marker = L.marker([lat, lng], { title: place.name })
              .addTo(mapInstance.current!)
              .bindPopup(place.display || place.name)
              .openPopup();
            setReverseMarker(marker);
        }
      } catch (e) {
          // Có thể hiển thị thông báo lỗi nếu muốn
      }
      });
    }
  }, []);

  // Cập nhật marker và vẽ route khi vị trí hoặc kho thay đổi
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Chỉ xóa marker và polyline, KHÔNG xóa tileLayer và trafficLayer
    map.eachLayer(layer => {
      // Không xóa trafficLayer (trafficLayerRef.current)
      if (trafficLayerRef.current && layer === trafficLayerRef.current) return;
      if (
        (layer instanceof L.Marker) ||
        (layer instanceof L.Polyline)
      ) {
        map.removeLayer(layer);
      }
    });

    // Xử lý marker khách hàng
    if (customerMarkerRef.current) {
      map.removeLayer(customerMarkerRef.current);
      customerMarkerRef.current = null;
    }
    if (customerPos) {
      customerMarkerRef.current = L.marker([customerPos.lat, customerPos.lng], { title: 'Vị trí của bạn' })
        .addTo(map)
        .bindPopup('Vị trí của bạn')
        .openPopup();
      map.setView([customerPos.lat, customerPos.lng], 10);
    }

    // Xử lý marker các kho
    warehouseMarkersRef.current.forEach(marker => map.removeLayer(marker));
    warehouseMarkersRef.current = warehouses.map(wh =>
      L.marker([wh.lat, wh.lng], { title: wh.name })
        .addTo(map)
        .bindPopup(wh.name)
        .on('click', () => setSelectedWarehouse(wh))
    );

    // Xử lý route polyline
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    // Vẽ đường đi khi chọn kho
    const drawRoute = async () => {
      if (customerPos && selectedWarehouse) {
        setIsLoading(true);
        const coordinates = await getRoute(customerPos, selectedWarehouse);
        setIsLoading(false);
        if (coordinates && coordinates.length > 1) {
          routePolylineRef.current = L.polyline(coordinates, { color: 'blue', weight: 5 }).addTo(map);
          map.fitBounds(L.latLngBounds(coordinates));
        }
      }
    };
    drawRoute();
    // eslint-disable-next-line
  }, [customerPos, selectedWarehouse]);

  // Format thời gian
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} giờ ${remainingMinutes} phút`;
  };

  // Format khoảng cách
  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters.toFixed(0)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Lấy biểu tượng hướng đi
  const getDirectionIcon = (sign: number) => {
    switch (sign) {
      case -3: return '↺'; // Quay đầu
      case -2: return '↻'; // Rẽ phải
      case -1: return '↶'; // Rẽ trái
      case 0: return '→'; // Tiếp tục
      case 1: return '↷'; // Rẽ phải nhẹ
      case 2: return '↶'; // Rẽ trái nhẹ
      case 3: return '↗'; // Rẽ phải gấp
      case 4: return '↖'; // Rẽ trái gấp
      case 5: return '↘'; // Rẽ phải rất gấp
      case 6: return '↖'; // Rẽ trái rất gấp
      case 7: return '↗'; // Rẽ phải nhẹ
      case 8: return '↖'; // Rẽ trái nhẹ
      default: return '→';
    }
  };

  // Gọi invalidateSize khi chuyển đổi phóng to/thu nhỏ bản đồ để tránh lỗi trắng
  useEffect(() => {
    if (mapInstance.current) {
      // Gọi nhiều lần để chắc chắn map cập nhật
      const id1 = setTimeout(() => mapInstance.current?.invalidateSize(), 100);
      const id2 = setTimeout(() => mapInstance.current?.invalidateSize(), 400);
      const handleResize = () => mapInstance.current?.invalidateSize();
      if (isMapFull) {
        window.addEventListener('resize', handleResize);
      }
      return () => {
        clearTimeout(id1);
        clearTimeout(id2);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isMapFull]);

  // Thêm/xóa lớp traffic khi showTraffic thay đổi
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (showTraffic) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = L.tileLayer(
          `https://maps.vietmap.vn/api/tf/{z}/{x}/{y}.png?apikey=${VIETMAP_TILE_API_KEY}`,
          { opacity: 0.8, zIndex: 100 }
        ).addTo(map);
      } else {
        map.addLayer(trafficLayerRef.current);
      }
    } else {
      if (trafficLayerRef.current) {
        map.removeLayer(trafficLayerRef.current);
      }
    }
  }, [showTraffic]);

  // Hàm tìm kiếm geocode
  const handleSearch = async () => {
    if (!searchText.trim()) return;
    setSearchLoading(true);
    try {
      const res = await axios.get('https://maps.vietmap.vn/api/search/v3', {
        params: {
          apikey: VIETMAP_TILE_API_KEY,
          text: searchText,
          focus: customerPos ? `${customerPos.lat},${customerPos.lng}` : undefined
        }
      });
      setSearchResults(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setSearchResults([]);
    }
    setSearchLoading(false);
  };

  // Hàm chọn kết quả tìm kiếm
  const handleSelectSearchResult = async (item: any) => {
    const map = mapInstance.current;
    if (!map) return;

    let lat: number | undefined, lng: number | undefined;

    // Nếu có entry_points (có lat/lng)
    if (item.entry_points && item.entry_points[0] && item.entry_points[0].lat && item.entry_points[0].lng) {
      lat = item.entry_points[0].lat;
      lng = item.entry_points[0].lng;
    } else if (item.ref_id) {
      // Gọi API Place để lấy lat/lng
      try {
        const res = await axios.get('https://maps.vietmap.vn/api/place/v3', {
          params: {
            apikey: VIETMAP_TILE_API_KEY,
            refid: item.ref_id
          }
        });
        if (
          res.data &&
          typeof (res.data as any).lat === 'number' &&
          typeof (res.data as any).lng === 'number'
        ) {
          lat = (res.data as any).lat;
          lng = (res.data as any).lng;
        }
            } catch (e) {
        // Không tìm được vị trí
      }
    }

    if (lat !== undefined && lng !== undefined) {
      if (searchMarker) map.removeLayer(searchMarker);
      const marker = L.marker([lat, lng], { title: item.name })
        .addTo(map)
        .bindPopup(`<b>${item.display || item.name}</b><br/><button id='route-to-here' style='margin-top:4px;padding:2px 8px;background:#f97316;color:#fff;border:none;border-radius:4px;cursor:pointer;'>Chỉ đường đến đây</button>`)
        .openPopup();
      setSearchMarker(marker);
      map.setView([lat, lng], 16);
      setDestination({ lat, lng, name: item.name || item.display });
      marker.on('popupopen', () => {
        const btn = document.getElementById('route-to-here');
        if (btn) {
          btn.onclick = () => {
            setSelectedWarehouse(null);
            setDestination({ lat, lng, name: item.name || item.display });
          };
        }
      });
      } else {
      if (searchMarker) map.removeLayer(searchMarker);
      const center = map.getCenter();
      const marker = L.marker(center, { title: item.name })
        .addTo(map)
        .bindPopup(item.display || item.name)
        .openPopup();
      setSearchMarker(marker);
    }
    setSearchResults([]);
  };

  // Xóa marker tìm kiếm khi đóng bản đồ hoặc thay đổi vị trí
  useEffect(() => {
    return () => {
      if (searchMarker && mapInstance.current) {
        mapInstance.current.removeLayer(searchMarker);
      }
    };
  }, [isMapFull, customerPos]);

  // Xóa marker reverse khi đóng bản đồ hoặc thay đổi vị trí
  useEffect(() => {
    return () => {
      if (reverseMarker && mapInstance.current) {
        mapInstance.current.removeLayer(reverseMarker);
      }
    };
  }, [isMapFull, customerPos]);

  // Reverse marker: thêm nút chỉ đường đến đây
  useEffect(() => {
    if (reverseMarker) {
      reverseMarker.on('popupopen', () => {
        const popup = reverseMarker.getPopup();
        if (!popup) return;
        const content = popup.getContent();
        if (typeof content === 'string' && !content.includes('route-to-here')) {
          // Thêm nút nếu chưa có
          popup.setContent(content + `<br/><button id='route-to-here' style='margin-top:4px;padding:2px 8px;background:#f97316;color:#fff;border:none;border-radius:4px;cursor:pointer;'>Chỉ đường đến đây</button>`);
        }
            setTimeout(() => {
          const btn = document.getElementById('route-to-here');
          if (btn) {
            btn.onclick = () => {
              const latlng = reverseMarker.getLatLng();
              setSelectedWarehouse(null);
              setDestination({ lat: latlng.lat, lng: latlng.lng, name: popup.getContent() as string });
            };
          }
        }, 100);
      });
    }
  }, [reverseMarker]);

  // Khi chọn kho thì bỏ destination
  useEffect(() => {
    if (selectedWarehouse) setDestination(null);
  }, [selectedWarehouse]);

  // Khi destination thay đổi, vẽ route từ customerPos đến destination
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (customerPos && destination) {
      // Xóa polyline cũ nếu có
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
      // Vẽ route mới
      (async () => {
        setIsLoading(true);
        const coordinates = await getRoute(customerPos, destination);
        setIsLoading(false);
        if (coordinates && coordinates.length > 1) {
          routePolylineRef.current = L.polyline(coordinates, { color: 'blue', weight: 5 }).addTo(map);
          map.fitBounds(L.latLngBounds(coordinates));
        }
      })();
    }
  }, [customerPos, destination]);

  const handleReverseBatch = async () => {
    if (!batchCoords.length) return;
    setBatchLoading(true);
    try {
      const res = await axios.post(
        `https://maps.vietmap.vn/api/geocode-fleet/reverse-batch?apikey=${VIETMAP_TILE_API_KEY}`,
        batchCoords.map(c => ({ lat: c.lat, lon: c.lng }))
      );
      setBatchResults(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setBatchResults([]);
    }
    setBatchLoading(false);
  };

  const handleRouteTolls = async () => {
    if (!tollsCoords.length) return;
    setTollsLoading(true);
    try {
      const res = await axios.post(
        `https://maps.vietmap.vn/api/route-tolls?api-version=1.1&apikey=${VIETMAP_TILE_API_KEY}&vehicle=${tollsVehicle}`,
        tollsCoords
      );
      setTollsResult(res.data);
    } catch (e) {
      setTollsResult(null);
    }
    setTollsLoading(false);
  };

  const handleMatchTolls = async () => {
    if (!matchTollsCoords.length) return;
    setMatchTollsLoading(true);
    try {
      const res = await axios.post<VietmapMatchTollsResponse>(
        `https://maps.vietmap.vn/api/match-tolls?api-version=1.1&apikey=${VIETMAP_TILE_API_KEY}&vehicle=${matchTollsVehicle}`,
        matchTollsCoords
      );
      const data = res.data as VietmapMatchTollsResponse;
      setMatchTollsResult(data);
      
      // Vẽ đường đi trên bản đồ
      if (data.path && Array.isArray(data.path)) {
        const map = mapInstance.current;
        if (!map) return;
        
        // Xóa đường cũ nếu có
        if (matchTollsPath) {
          map.removeLayer(matchTollsPath);
        }
        
        // Vẽ đường mới
        const path = L.polyline(data.path, { color: 'green', weight: 5 }).addTo(map);
        setMatchTollsPath(path);
        map.fitBounds(L.latLngBounds(data.path));
      }
    } catch (e) {
      setMatchTollsResult(null);
    }
    setMatchTollsLoading(false);
  };

  const handleTSP = async () => {
    if (!tspPoints.length) return;
    setTspLoading(true);
    try {
      // Xóa markers và path cũ
      if (tspPath) mapInstance.current?.removeLayer(tspPath);
      tspMarkers.forEach(marker => mapInstance.current?.removeLayer(marker));
      setTspMarkers([]);

      // Gọi API TSP
      const points = tspPoints.map(([lat, lng]) => `${lat},${lng}`);
      const res = await axios.get<VietmapTSPResponse>(
        `https://maps.vietmap.vn/api/tsp`,
        {
          params: {
            'api-version': '1.1',
            apikey: VIETMAP_TILE_API_KEY,
            point: points,
            vehicle: tspVehicle,
            roundtrip: tspRoundtrip,
            sources: tspSources,
            destinations: tspDestinations,
            points_encoded: true
          },
          paramsSerializer: params => {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
              if (Array.isArray(value)) {
                value.forEach(v => searchParams.append(key, v));
              } else {
                searchParams.append(key, value as string);
              }
            });
            return searchParams.toString();
          }
        }
      );

      setTspResult(res.data);

      // Vẽ đường đi và markers
      if (res.data.paths?.[0]) {
        const path = res.data.paths[0];
        const decodedPoints: [number, number][] = polyline.decode(path.points);
        const coordinates = decodedPoints.map(
          ([lat, lng]) => L.latLng(lat, lng)
        );

        // Vẽ đường đi
        const routeLine = L.polyline(coordinates, { color: 'purple', weight: 5 }).addTo(mapInstance.current!);
        setTspPath(routeLine);

        // Vẽ markers cho các điểm
        const markers = tspPoints.map(([lat, lng], index) => 
          L.marker([lat, lng], { title: `Điểm ${index + 1}` })
            .addTo(mapInstance.current!)
            .bindPopup(`Điểm ${index + 1}`)
        );
        setTspMarkers(markers);

        // Zoom to bounds
        mapInstance.current?.fitBounds(L.latLngBounds(coordinates));
      }
    } catch (e) {
      setTspResult(null);
    }
    setTspLoading(false);
  };

  const handleVRP = async () => {
    if (!vrpVehicles.length || !vrpJobs.length) return;
    setVrpLoading(true);
    try {
      // Xóa paths và markers cũ
      vrpPaths.forEach(path => mapInstance.current?.removeLayer(path));
      vrpMarkers.forEach(marker => mapInstance.current?.removeLayer(marker));
      setVrpPaths([]);
      setVrpMarkers([]);

      // Gọi API VRP
      const res = await axios.post<VietmapVRPResponse>(
        `https://maps.vietmap.vn/api/vrp?api-version=1.1&apikey=${VIETMAP_TILE_API_KEY}`,
        {
          vehicles: vrpVehicles,
          jobs: vrpJobs
        }
      );

      setVrpResult(res.data);

      // Vẽ đường đi và markers cho mỗi route
      const paths: L.Polyline[] = [];
      const markers: L.Marker[] = [];
      const colors = ['#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#00FFFF', '#FFFF00'];

      res.data.routes.forEach((route, index) => {
        const color = colors[index % colors.length];
        
        // Vẽ đường đi
        if (route.geometry) {
          const coordinates = polyline.decode(route.geometry).map(
            ([lat, lng]) => L.latLng(lat, lng)
          );
          const path = L.polyline(coordinates, { color, weight: 5 }).addTo(mapInstance.current!);
          paths.push(path);
        }

        // Vẽ markers cho các điểm
        route.steps.forEach(step => {
          if (step.location) {
            const marker = L.marker(step.location, {
              title: `Xe ${route.vehicle} - ${step.type}`
            })
              .addTo(mapInstance.current!)
              .bindPopup(`
                <b>Xe ${route.vehicle}</b><br/>
                Loại: ${step.type}<br/>
                Thời gian đến: ${new Date(step.arrival * 1000).toLocaleString()}<br/>
                Khoảng cách: ${(step.distance / 1000).toFixed(2)} km
              `);
            markers.push(marker);
          }
        });
      });

      setVrpPaths(paths);
      setVrpMarkers(markers);

      // Zoom to bounds
      if (paths.length > 0) {
        const bounds = L.latLngBounds(paths.flatMap(path => path.getLatLngs() as L.LatLng[]));
        mapInstance.current?.fitBounds(bounds);
      }
            } catch (e) {
      setVrpResult(null);
    }
    setVrpLoading(false);
  };

  const handleMatrix = async () => {
    if (!matrixPoints.length) return;
    setMatrixLoading(true);
    setMatrixError(null);
    setMatrixResult(null);
    try {
      const params: any = {
        'api-version': '1.1',
        apikey: VIETMAP_TILE_API_KEY,
        vehicle: matrixVehicle,
        annotation: matrixAnnotation,
        points_encoded: false
      };
      matrixPoints.forEach(([lat, lng]) => {
        params.point = params.point || [];
        params.point.push(`${lat},${lng}`);
      });
      if (matrixSources !== 'all') params.sources = matrixSources;
      if (matrixDestinations !== 'all') params.destinations = matrixDestinations;
      const res = await axios.get<VietmapMatrixResponse>(
        'https://maps.vietmap.vn/api/matrix',
        { params }
      );
      setMatrixResult(res.data);
    } catch (e: any) {
      setMatrixError('Có lỗi xảy ra khi gọi API Matrix.');
    }
    setMatrixLoading(false);
  };

  const handleGeofencing = async () => {
    if (!customerPos || !geoCenters.length) return;
    setGeoLoading(true);
    setGeoError(null);
    setGeoResult(null);
    try {
      // Xóa circle và marker cũ
      if (geoCircle) mapInstance.current?.removeLayer(geoCircle);
      geoMarkers.forEach(m => mapInstance.current?.removeLayer(m));
      setGeoCircle(null);
      setGeoMarkers([]);

      // Gọi API
      const body = {
        geometryCenters: geoCenters.map((c, i) => ({ id: c.id, long: c.lng, lat: c.lat })),
        radius: geoRadius,
        long: customerPos.lng,
        lat: customerPos.lat
      };
      const res = await axios.post<VietmapGeofencingResponse>(
        `https://maps.vietmap.vn/api/geofencing?apikey=${VIETMAP_TILE_API_KEY}`,
        body
      );
      setGeoResult(res.data);

      // Vẽ vòng tròn bán kính
      const circle = L.circle([customerPos.lat, customerPos.lng], {
        radius: geoRadius,
        color: '#219EBC',
        fillColor: '#8ECAE6',
        fillOpacity: 0.2,
        weight: 2
      }).addTo(mapInstance.current!);
      setGeoCircle(circle);

      // Vẽ marker các điểm kiểm tra
      const markers: L.Marker[] = [];
      res.data.data.forEach((item, idx) => {
        const center = geoCenters.find(c => c.id === item.id);
        if (center) {
          const marker = L.marker([center.lat, center.lng], {
            icon: L.divIcon({
              className: '',
              html: `<div style="background:${item.inside ? '#22c55e' : '#ef4444'};width:18px;height:18px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 4px #0003;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;">${item.id}</div>`
            })
          }).addTo(mapInstance.current!);
          marker.bindPopup(`ID: <b>${item.id}</b><br/>${item.inside ? '<span class="text-green-600">Bên trong</span>' : '<span class="text-red-600">Bên ngoài</span>'}`);
          markers.push(marker);
        }
      });
      setGeoMarkers(markers);

      // Zoom to fit
      const bounds = L.latLngBounds([
        [customerPos.lat, customerPos.lng],
        ...geoCenters.map(c => [c.lat, c.lng] as [number, number])
      ]);
      mapInstance.current?.fitBounds(bounds, { padding: [40, 40] });

      // Vẽ marker vị trí customer (nếu chưa có)
      if (customerMarkerRef.current) {
        mapInstance.current?.removeLayer(customerMarkerRef.current);
        customerMarkerRef.current = null;
      }
      customerMarkerRef.current = L.marker([customerPos.lat, customerPos.lng], {
        title: 'Vị trí của bạn',
        icon: L.divIcon({
          className: '',
          html: `<div style="background:#2563eb;width:22px;height:22px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 6px #0003;display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;">📍</div>`
        })
      })
        .addTo(mapInstance.current!)
        .bindPopup('Vị trí của bạn');
    } catch (e: any) {
      setGeoError('Có lỗi xảy ra khi gọi API Geofencing.');
    }
    setGeoLoading(false);
  };

  // Hàm gọi API Autocomplete
  const handleAutocomplete = async (text: string) => {
    if (!text.trim()) {
      setAutoResults([]);
      setAutoDropdown(false);
      return;
    }
    setAutoLoading(true);
    setAutoDropdown(true);
    try {
      const res = await axios.get<VietmapAutocompleteItem[]>(
        'https://maps.vietmap.vn/api/autocomplete/v3',
        {
          params: {
            apikey: VIETMAP_TILE_API_KEY,
            text,
            focus: customerPos ? `${customerPos.lat},${customerPos.lng}` : undefined
          }
        }
      );
      setAutoResults(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAutoResults([]);
    }
    setAutoLoading(false);
  };

  // Hàm chọn gợi ý
  const handleSelectAuto = async (item: VietmapAutocompleteItem) => {
    setAutoDropdown(false);
    const map = mapInstance.current;
    if (!map) return;
    let lat: number | undefined, lng: number | undefined;
    // Nếu có entry_points (có lat/lng)
    if (item.entry_points && item.entry_points[0] && item.entry_points[0].lat && item.entry_points[0].lng) {
      lat = item.entry_points[0].lat;
      lng = item.entry_points[0].lng;
    } else if (item.ref_id) {
      // Gọi API Place để lấy lat/lng
      try {
        const res = await axios.get('https://maps.vietmap.vn/api/place/v3', {
          params: {
            apikey: VIETMAP_TILE_API_KEY,
            refid: item.ref_id
          }
        });
        if (
          res.data &&
          typeof (res.data as any).lat === 'number' &&
          typeof (res.data as any).lng === 'number'
        ) {
          lat = (res.data as any).lat;
          lng = (res.data as any).lng;
        }
      } catch {}
    }
    if (lat !== undefined && lng !== undefined) {
      if (autoMarker) map.removeLayer(autoMarker);
      const marker = L.marker([lat, lng], { title: item.display })
        .addTo(map)
        .bindPopup(`
          <b>${item.display}</b><br/>${item.address}<br/>
          <button id='route-to-here-autocomplete' style='margin-top:6px;padding:3px 12px;background:#f97316;color:#fff;border:none;border-radius:4px;cursor:pointer;'>Chỉ đường đến đây</button>
        `)
        .openPopup();
      setAutoMarker(marker);
      map.setView([lat, lng], 16);
      // Thêm sự kiện cho nút chỉ đường
      setTimeout(() => {
        const btn = document.getElementById('route-to-here-autocomplete');
        if (btn) {
          btn.onclick = () => {
            setSelectedWarehouse(null);
            setDestination({ lat, lng, name: item.display });
          };
        }
      }, 200);
    }
    setAutoText(item.display);
  };

  return <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Hỗ trợ</h1>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="font-medium flex items-center gap-2 mb-4">
            <MessageCircleIcon className="h-5 w-5 text-orange-500" />
            Liên hệ hỗ trợ
          </h2>
          <div className="space-y-4">
            <button onClick={() => setIsChatOpen(true)} className="w-full p-4 border border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50 flex items-center justify-center gap-2">
              <MessageCircleIcon className="h-5 w-5" />
              Chat với trợ lý AI
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <PhoneIcon className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <div className="font-medium">Hotline</div>
                <div className="text-orange-500">0326302451</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <MailIcon className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <div className="font-medium">Email</div>
                <div className="text-orange-500">vongocluy12345@gmail.com</div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="font-medium flex items-center gap-2 mb-4">
            <BookOpenIcon className="h-5 w-5 text-orange-500" />
            Hướng dẫn sử dụng
          </h2>
          <div className="space-y-3">
            {guides.map((guide, index) => (
              <button key={index} className="w-full text-left px-4 py-2 rounded hover:bg-gray-50 flex items-center gap-2"
                onClick={() => handleGuideClick(guide)}>
                <HelpCircleIcon className="h-4 w-4 text-gray-400" />
                <span>{guide.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="font-medium mb-4">Câu hỏi thường gặp</h2>
        <div className="space-y-4">
          {[{
          q: 'Làm thế nào để theo dõi đơn hàng?',
          a: 'Bạn có thể theo dõi đơn hàng bằng cách nhập mã đơn hàng vào mục Theo dõi đơn hàng trên trang chủ hoặc trong mục Đơn hàng.'
        }, {
          q: 'Thời gian giao hàng mất bao lâu?',
          a: 'Thời gian giao hàng phụ thuộc vào khoảng cách và dịch vụ vận chuyển bạn chọn. Thông thường từ 1-3 ngày đối với nội thành và 3-5 ngày đối với các tỉnh.'
        }, {
          q: 'Làm sao để hủy đơn hàng?',
          a: 'Bạn có thể hủy đơn hàng trong vòng 2 giờ sau khi tạo đơn nếu đơn hàng chưa được xử lý. Vui lòng liên hệ hotline nếu cần hỗ trợ.'
        }].map((item, index) => <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 font-medium mb-2">
                <HelpCircleIcon className="h-5 w-5 text-orange-500" />
                {item.q}
              </div>
              <div className="text-gray-600 pl-7">{item.a}</div>
            </div>)}
        </div>
      </div>
      <AIChatBox isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      {/* Modal hướng dẫn chi tiết */}
      {modalGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <button onClick={() => setModalGuide(null)} className="absolute top-2 right-2 text-gray-400 hover:text-orange-500 text-xl">×</button>
            <h3 className="text-lg font-bold mb-2 text-orange-500">{modalGuide.title}</h3>
            <div className="text-gray-700 whitespace-pre-line">{modalGuide.detail}</div>
          </div>
        </div>
      )}
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Hỗ trợ khách hàng</h2>
        <p className="mb-4">Nếu bạn cần hỗ trợ, vui lòng liên hệ với chúng tôi hoặc xem vị trí trên bản đồ dưới đây:</p>
        
        {/* Thêm UI chọn kho */}
        <div className="mb-4">
          <h3 className="font-bold mb-2">Chọn kho để chỉ đường:</h3>
          <div className="flex gap-2">
            {warehouses.map((wh, idx) => (
              <button
                key={idx}
                className={`px-4 py-2 rounded ${selectedWarehouse?.name === wh.name ? 'bg-orange-500 text-white' : 'bg-gray-100'}`}
                onClick={() => setSelectedWarehouse(wh)}
                disabled={isLoading}
              >
                {wh.name}
              </button>
            ))}
          </div>
          {isLoading && (
            <div className="mt-2 text-orange-500">
              Đang tìm đường đi...
            </div>
          )}
        </div>

        {/* Nút bật/tắt giao thông và phóng to/thu nhỏ bản đồ */}
        <div className="flex gap-2 justify-end mb-2">
          <button
            className={`px-3 py-1 rounded ${showTraffic ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'} shadow`}
            onClick={() => setShowTraffic(v => !v)}
          >
            {showTraffic ? 'Tắt giao thông' : 'Bật giao thông'}
          </button>
          <button
            className="px-3 py-1 rounded bg-orange-500 text-white hover:bg-orange-600 text-sm shadow"
            onClick={() => setIsMapFull(v => !v)}
          >
            {isMapFull ? 'Thu nhỏ bản đồ' : 'Phóng to bản đồ'}
          </button>
        </div>
        <div className={isMapFull ? "fixed inset-0 z-[9999] bg-gray-100 bg-opacity-95 flex items-center justify-center" : "w-full h-[500px] rounded-lg overflow-hidden border shadow"}>
          <div
            ref={mapRef}
            id="vietmap"
            style={{ width: isMapFull ? '90vw' : '100%', height: isMapFull ? '80vh' : '500px', borderRadius: isMapFull ? 12 : undefined, boxShadow: isMapFull ? '0 4px 32px #0002' : undefined, background: undefined, overflow: 'hidden', position: 'relative', zIndex: 10 }}
            className={isMapFull ? 'relative z-[9999]' : ''}
          >
            {/* Nút đóng fullscreen */}
            {isMapFull && (
              <button
                onClick={() => setIsMapFull(false)}
                className="fixed top-6 right-10 z-[10010] bg-white border border-orange-400 shadow-lg rounded-full w-12 h-12 flex items-center justify-center text-2xl text-orange-500 hover:bg-orange-100 transition"
                style={{ boxShadow: '0 2px 12px #0002' }}
                aria-label="Đóng bản đồ fullscreen"
              >
                ×
              </button>
            )}
            {/* Autocomplete nổi trên bản đồ */}
            <div className="absolute top-2 left-4 z-[1001] w-[420px]" style={{pointerEvents: 'auto'}}>
              <div className="bg-white rounded-full shadow-lg flex items-center px-4 py-2 border border-orange-200">
                <input
                  className="flex-1 border-none outline-none bg-transparent text-base px-2"
                  placeholder="Nhập địa chỉ, tên đường, POI..."
                  value={autoText}
                  onChange={e => {
                    setAutoText(e.target.value);
                    handleAutocomplete(e.target.value);
                  }}
                  onFocus={() => autoText && setAutoDropdown(true)}
                  autoComplete="off"
                  style={{minWidth: 0}}
                />
              </div>
              {autoDropdown && (
                <div className="absolute left-0 mt-2 w-full bg-white border rounded-lg shadow-lg z-50 max-h-72 overflow-auto">
                  {autoLoading && <div className="p-2 text-gray-500">Đang tìm kiếm...</div>}
                  {!autoLoading && autoResults.length === 0 && <div className="p-2 text-gray-500">Không có kết quả</div>}
                  {autoResults.map((item, i) => (
                    <div
                      key={i}
                      className="px-4 py-2 hover:bg-orange-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => handleSelectAuto(item)}
                    >
                      <div className="font-semibold text-orange-600">{item.display}</div>
                      <div className="text-xs text-gray-500">{item.address}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {routeInfo && (
          <div className="w-full flex flex-col items-center mt-4">
            <div className="bg-white bg-opacity-90 rounded shadow p-6 min-w-[320px] max-w-3xl w-full flex flex-col gap-3 items-center border border-orange-200">
              <div className="font-semibold text-orange-600 text-xl">Tuyến đường thực tế</div>
              <div>Khoảng cách: <b>{(routeInfo.distance / 1000).toFixed(2)} km</b></div>
              <div>
                Thời gian dự kiến: <b>{(() => {
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
                })()}</b>
              </div>
            </div>
            {/* Nút ẩn/mở hướng dẫn */}
            <button
              className="mt-2 mb-1 px-3 py-1 rounded bg-orange-500 text-white hover:bg-orange-600 text-sm shadow"
              onClick={() => setShowInstructions(v => !v)}
            >
              {showInstructions ? 'Ẩn hướng dẫn từng chặng' : 'Xem hướng dẫn từng chặng'}
            </button>
            {showInstructions && routeInstructions && routeInstructions.length > 0 && (
              <div className="mt-2 bg-white rounded shadow p-4 text-sm max-h-40 overflow-y-auto max-w-3xl mx-auto">
                <div className="font-semibold text-gray-700 mb-1">Hướng dẫn từng chặng:</div>
                <ol className="list-decimal ml-5">
                  {routeInstructions.map((ins, i) => (
                    <li key={i}>{ins.text} ({(ins.distance/1000).toFixed(2)} km, {Math.round(ins.time/60000)} phút)</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Batch reverse UI */}
        <div className="mb-4">
          <div className="font-bold mb-1">Reverse Batch (nhập danh sách lat,lng, mỗi dòng 1 điểm):</div>
          <textarea
            className="border rounded px-2 py-1 w-full mb-2"
            rows={3}
            placeholder={"10.91527176296465,107.42193008289291\n10.889979077535088,107.4267435202076"}
            onChange={e => {
              const lines = e.target.value.split('\n').map(line => line.trim()).filter(Boolean);
              setBatchCoords(
                lines.map(line => {
                  const [lat, lng] = line.split(',').map(Number);
                  return { lat, lng };
                }).filter(c => !isNaN(c.lat) && !isNaN(c.lng))
              );
            }}
          />
          <button
            className="px-3 py-1 rounded bg-orange-500 text-white hover:bg-orange-600 text-sm shadow"
            onClick={handleReverseBatch}
            disabled={batchLoading || !batchCoords.length}
          >
            {batchLoading ? 'Đang tra cứu...' : 'Tra cứu địa chỉ hàng loạt'}
          </button>
          {batchResults.length > 0 && (
            <div className="mt-2 bg-white rounded shadow p-2 text-sm max-h-40 overflow-y-auto">
              <div className="font-semibold mb-1">Kết quả:</div>
              <ol className="list-decimal ml-5">
                {batchResults.map((item, i) => (
                  <li key={i}>
                    {item.address?.address || item.network?.name || 'Không tìm thấy địa chỉ'}<br />
                    <span className="text-gray-500">
                      {item.admin?.names?.join(', ')}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Thêm UI nhập route-tolls phía trên bản đồ */}
        <div className="mb-4">
          <div className="font-bold mb-1">Route-tolls (nhập danh sách [lng,lat], mỗi dòng 1 điểm):</div>
          <textarea
            className="border rounded px-2 py-1 w-full mb-2"
            rows={3}
            placeholder="[106.765137,10.477009]\n[108.363304,11.398591]"
            onChange={e => {
              const lines = e.target.value.split('\n').map(line => line.trim()).filter(Boolean);
              setTollsCoords(
                lines.map(line => {
                  try {
                    const arr = JSON.parse(line);
                    if (Array.isArray(arr) && arr.length === 2) return [Number(arr[0]), Number(arr[1])] as [number, number];
                  } catch {}
                  return null;
                }).filter(Boolean) as [number, number][]
              );
            }}
          />
          <div className="flex gap-2 items-center mb-2">
            <span>Loại xe:</span>
            <select
              className="border rounded px-2 py-1"
              value={tollsVehicle}
              onChange={e => setTollsVehicle(Number(e.target.value))}
            >
              <option value={1}>1 - Xe con, tải &lt;2t</option>
              <option value={2}>2 - Xe con ≤30 chỗ, tải &lt;4t</option>
              <option value={3}>3 - Xe con &gt;31 chỗ, tải &lt;10t</option>
              <option value={4}>4 - Tải &lt;18t, đầu kéo ≤20ft</option>
              <option value={5}>5 - Tải ≥18t, đầu kéo &gt;20ft</option>
            </select>
            <button
              className="px-3 py-1 rounded bg-orange-500 text-white hover:bg-orange-600 text-sm shadow"
              onClick={handleRouteTolls}
              disabled={tollsLoading || !tollsCoords.length}
            >
              {tollsLoading ? 'Đang tra cứu...' : 'Tính phí đường bộ'}
            </button>
          </div>
          {tollsResult && (
            <div className="mt-2 bg-white rounded shadow p-2 text-sm max-h-40 overflow-y-auto">
              <div className="font-semibold mb-1">Kết quả trạm thu phí:</div>
              <ol className="list-decimal ml-5">
                {tollsResult.tolls?.map((item: any, i: number) => (
                  <li key={i}>
                    <b>{item.name}</b> - {item.address} <br />
                    <span className="text-gray-500">Loại: {item.type || '---'} | Phí: {item.amount?.toLocaleString() || 0}đ</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Thêm UI Match-tolls phía trên bản đồ */}
        <div className="mb-4">
          <div className="font-bold mb-1">Match-tolls (nhập danh sách [lng,lat], mỗi dòng 1 điểm):</div>
          <textarea
            className="border rounded px-2 py-1 w-full mb-2"
            rows={3}
            placeholder="[106.757849,10.817956]\n[106.759134,10.821371]\n[106.760694,10.825196]"
            onChange={e => {
              const lines = e.target.value.split('\n').map(line => line.trim()).filter(Boolean);
              setMatchTollsCoords(
                lines.map(line => {
                  try {
                    const arr = JSON.parse(line);
                    if (Array.isArray(arr) && arr.length === 2) return [Number(arr[0]), Number(arr[1])] as [number, number];
                  } catch {}
                  return null;
                }).filter(Boolean) as [number, number][]
              );
            }}
          />
          <div className="flex gap-2 items-center mb-2">
            <span>Loại xe:</span>
            <select
              className="border rounded px-2 py-1"
              value={matchTollsVehicle}
              onChange={e => setMatchTollsVehicle(Number(e.target.value))}
            >
              <option value={1}>1 - Xe con &lt;12 chỗ, tải &lt;2t</option>
              <option value={2}>2 - Xe con ≤30 chỗ, tải &lt;4t</option>
              <option value={3}>3 - Xe con &gt;31 chỗ, tải &lt;10t</option>
              <option value={4}>4 - Tải &lt;18t, đầu kéo ≤20ft</option>
              <option value={5}>5 - Tải ≥18t, đầu kéo &gt;20ft</option>
            </select>
            <button
              className="px-3 py-1 rounded bg-orange-500 text-white hover:bg-orange-600 text-sm shadow"
              onClick={handleMatchTolls}
              disabled={matchTollsLoading || !matchTollsCoords.length}
            >
              {matchTollsLoading ? 'Đang tính toán...' : 'Tính toán tuyến đường và phí'}
            </button>
          </div>
          {matchTollsResult && (
            <div className="mt-2 bg-white rounded shadow p-2 text-sm max-h-40 overflow-y-auto">
              <div className="font-semibold mb-1">Kết quả:</div>
              <div className="mb-2">Tổng quãng đường: <b>{matchTollsResult.distance?.toFixed(2)} km</b></div>
              {matchTollsResult.tolls?.length > 0 && (
                <>
                  <div className="font-semibold mb-1">Danh sách trạm thu phí:</div>
                  <ol className="list-decimal ml-5">
                    {matchTollsResult.tolls.map((item: any, i: number) => (
                      <li key={i}>
                        <b>{item.name}</b> - {item.address} <br />
                        <span className="text-gray-500">Loại: {item.type || '---'} | Phí: {item.price?.toLocaleString() || 0}đ</span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          )}
        </div>

        {/* Thêm UI TSP phía trên bản đồ */}
        <div className="mb-4">
          <div className="font-bold mb-1">Tối ưu lộ trình (TSP) - nhập danh sách [lat,lng], mỗi dòng 1 điểm:</div>
          <textarea
            className="border rounded px-2 py-1 w-full mb-2"
            rows={3}
            placeholder="[10.79628438955497,106.70592293472612]\n[10.801891047584164,106.70660958023404]\n[10.801595962927763,106.6898296806408]"
            onChange={e => {
              const lines = e.target.value.split('\n').map(line => line.trim()).filter(Boolean);
              setTspPoints(
                lines.map(line => {
                  try {
                    const arr = JSON.parse(line);
                    if (Array.isArray(arr) && arr.length === 2) return [Number(arr[0]), Number(arr[1])] as [number, number];
                  } catch {}
                  return null;
                }).filter(Boolean) as [number, number][]
              );
            }}
          />
          <div className="flex flex-wrap gap-4 mb-2">
            <div className="flex items-center gap-2">
              <span>Loại xe:</span>
              <select
                className="border rounded px-2 py-1"
                value={tspVehicle}
                onChange={e => setTspVehicle(e.target.value)}
              >
                <option value="car">Ô tô</option>
                <option value="bike">Xe đạp</option>
                <option value="foot">Đi bộ</option>
                <option value="motorcycle">Xe máy</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span>Điểm xuất phát:</span>
              <select
                className="border rounded px-2 py-1"
                value={tspSources}
                onChange={e => setTspSources(e.target.value)}
              >
                <option value="any">Bất kỳ</option>
                <option value="first">Điểm đầu tiên</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span>Điểm kết thúc:</span>
              <select
                className="border rounded px-2 py-1"
                value={tspDestinations}
                onChange={e => setTspDestinations(e.target.value)}
              >
                <option value="any">Bất kỳ</option>
                <option value="last">Điểm cuối cùng</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span>Quay về điểm xuất phát:</span>
              <select
                className="border rounded px-2 py-1"
                value={tspRoundtrip ? 'true' : 'false'}
                onChange={e => setTspRoundtrip(e.target.value === 'true')}
              >
                <option value="true">Có</option>
                <option value="false">Không</option>
              </select>
            </div>
          </div>
          <button
            className="px-3 py-1 rounded bg-orange-500 text-white hover:bg-orange-600 text-sm shadow"
            onClick={handleTSP}
            disabled={tspLoading || !tspPoints.length}
          >
            {tspLoading ? 'Đang tính toán...' : 'Tối ưu lộ trình'}
          </button>
          {tspResult && (
            <div className="mt-2 bg-white rounded shadow p-2 text-sm max-h-40 overflow-y-auto">
              <div className="font-semibold mb-1">Kết quả:</div>
              <div className="mb-2">
                Tổng quãng đường: <b>{(tspResult.paths[0].distance / 1000).toFixed(2)} km</b><br />
                Thời gian dự kiến: <b>{formatTime(tspResult.paths[0].time)}</b>
              </div>
              {tspResult.paths[0].instructions?.length > 0 && (
                <>
                  <div className="font-semibold mb-1">Hướng dẫn từng chặng:</div>
                  <ol className="list-decimal ml-5">
                    {tspResult.paths[0].instructions.map((ins, i) => (
                      <li key={i}>
                        {ins.text} ({(ins.distance/1000).toFixed(2)} km, {Math.round(ins.time/60000)} phút)
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          )}
        </div>

        {/* Thêm UI VRP phía trên bản đồ */}
        <div className="mb-4">
          <div className="font-bold mb-1">Tối ưu lộ trình nhiều xe (VRP):</div>
          
          {/* Nhập thông tin xe */}
          <div className="mb-4">
            <div className="font-semibold mb-2">Danh sách xe:</div>
            <textarea
              className="border rounded px-2 py-1 w-full mb-2"
              rows={5}
              placeholder={`[
{
  "id": 1,
  "start": [106.5983012, 10.8879148],
  "end": [106.5983012, 10.8879148],
  "profile": "bike",
  "time_window": [1685953800, 1686418200],
  "skills": [1, 1000]
}
]`}
              onChange={e => {
                try {
                  const vehicles = JSON.parse(e.target.value);
                  if (Array.isArray(vehicles)) {
                    setVrpVehicles(vehicles);
                  }
                } catch {}
              }}
            />
          </div>

          {/* Nhập thông tin điểm giao hàng */}
          <div className="mb-4">
            <div className="font-semibold mb-2">Danh sách điểm giao hàng:</div>
            <textarea
              className="border rounded px-2 py-1 w-full mb-2"
              rows={5}
              placeholder={`[
{
  "id": 1001,
  "description": "HOME",
  "location": [106.5983012, 10.8879148],
  "service": 0,
  "priority": 3,
  "time_windows": [[1685986200, 1685988000]],
  "skills": [1000]
}
]`}
              onChange={e => {
                try {
                  const jobs = JSON.parse(e.target.value);
                  if (Array.isArray(jobs)) {
                    setVrpJobs(jobs);
                  }
                } catch {}
              }}
            />
          </div>

          <button
            className="px-3 py-1 rounded bg-orange-500 text-white hover:bg-orange-600 text-sm shadow"
            onClick={handleVRP}
            disabled={vrpLoading || !vrpVehicles.length || !vrpJobs.length}
          >
            {vrpLoading ? 'Đang tính toán...' : 'Tối ưu lộ trình nhiều xe'}
          </button>

          {vrpResult && (
            <div className="mt-2 bg-white rounded shadow p-2 text-sm max-h-40 overflow-y-auto">
              <div className="font-semibold mb-1">Kết quả:</div>
              <div className="mb-2">
                Tổng quãng đường: <b>{(vrpResult.summary.distance / 1000).toFixed(2)} km</b><br />
                Tổng thời gian: <b>{formatTime(vrpResult.summary.duration)}</b><br />
                Thời gian chờ: <b>{formatTime(vrpResult.summary.waiting_time)}</b><br />
                Số điểm không được phân công: <b>{vrpResult.summary.unassigned}</b>
              </div>
              {vrpResult.routes.length > 0 && (
                <>
                  <div className="font-semibold mb-1">Chi tiết từng tuyến:</div>
                  {vrpResult.routes.map((route, index) => (
                    <div key={index} className="mb-2">
                      <b>Xe {route.vehicle}:</b><br />
                      - Quãng đường: {(route.distance / 1000).toFixed(2)} km<br />
                      - Thời gian: {formatTime(route.duration)}<br />
                      - Thời gian chờ: {formatTime(route.waiting_time)}<br />
                      - Số điểm ghé thăm: {route.steps.filter(s => s.type === 'job').length}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Thêm UI Matrix phía trên bản đồ */}
        <div className="mb-4">
          <div className="font-bold mb-1">Tính toán ma trận thời gian/khoảng cách (Matrix):</div>
          <textarea
            className="border rounded px-2 py-1 w-full mb-2"
            rows={3}
            placeholder={"10.768897,106.678505\n10.765496,106.67626\n10.7627936,106.6750729\n10.7616745,106.6792425"}
            onChange={e => {
              const lines = e.target.value.split('\n').map(line => line.trim()).filter(Boolean);
              setMatrixPoints(
                lines.map(line => {
                  const [lat, lng] = line.split(',').map(Number);
                  return [Number(lat), Number(lng)] as [number, number];
                }).filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng))
              );
            }}
          />
          <div className="flex flex-wrap gap-4 mb-2">
            <div className="flex items-center gap-2">
              <span>Loại xe:</span>
              <select
                className="border rounded px-2 py-1"
                value={matrixVehicle}
                onChange={e => setMatrixVehicle(e.target.value)}
              >
                <option value="car">Ô tô</option>
                <option value="bike">Xe đạp</option>
                <option value="foot">Đi bộ</option>
                <option value="motorcycle">Xe máy</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span>Sources:</span>
              <input
                className="border rounded px-2 py-1 w-24"
                value={matrixSources}
                onChange={e => setMatrixSources(e.target.value)}
                placeholder="all hoặc 0;1"
              />
            </div>
            <div className="flex items-center gap-2">
              <span>Destinations:</span>
              <input
                className="border rounded px-2 py-1 w-24"
                value={matrixDestinations}
                onChange={e => setMatrixDestinations(e.target.value)}
                placeholder="all hoặc 2;3"
              />
            </div>
            <div className="flex items-center gap-2">
              <span>Loại kết quả:</span>
              <select
                className="border rounded px-2 py-1"
                value={matrixAnnotation}
                onChange={e => setMatrixAnnotation(e.target.value as 'duration' | 'distance')}
              >
                <option value="duration">Thời gian (giây)</option>
                <option value="distance">Khoảng cách (m)</option>
              </select>
            </div>
          </div>
          <button
            className="px-3 py-1 rounded bg-orange-500 text-white hover:bg-orange-600 text-sm shadow"
            onClick={handleMatrix}
            disabled={matrixLoading || !matrixPoints.length}
          >
            {matrixLoading ? 'Đang tính toán...' : 'Tính toán ma trận'}
          </button>
          {matrixError && <div className="text-red-500 mt-2">{matrixError}</div>}
          {matrixResult && (
            <div className="mt-2 bg-white rounded shadow p-2 text-sm max-h-60 overflow-auto">
              <div className="font-semibold mb-1">Kết quả ma trận ({matrixAnnotation === 'duration' ? 'Thời gian (giây)' : 'Khoảng cách (m)'}):</div>
              <table className="border-collapse w-full text-xs">
                <thead>
                  <tr>
                    <th className="border px-2 py-1 bg-gray-100">Nguồn \ Đích</th>
                    {matrixResult[matrixAnnotation === 'duration' ? 'durations' : 'distances']?.[0]?.map((_, j) => (
                      <th key={j} className="border px-2 py-1 bg-gray-50">{j}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixResult[matrixAnnotation === 'duration' ? 'durations' : 'distances']?.map((row, i) => (
                    <tr key={i}>
                      <td className="border px-2 py-1 bg-gray-50 font-semibold">{i}</td>
                      {row.map((val, j) => (
                        <td key={j} className="border px-2 py-1 text-center">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Thêm UI Geofencing phía trên bản đồ */}
        <div className="mb-4">
          <div className="font-bold mb-1">Kiểm tra rào địa lý (Geofencing):</div>
          <div className="flex flex-wrap gap-4 mb-2 items-center">
            <span>Danh sách điểm kiểm tra (mỗi dòng: id,lat,lng):</span>
            <textarea
              className="border rounded px-2 py-1 w-64"
              rows={3}
              placeholder={"1,10.7628,106.682\n2,10.7632,106.681"}
              onChange={e => {
                const lines = e.target.value.split('\n').map(line => line.trim()).filter(Boolean);
                setGeoCenters(
                  lines.map(line => {
                    const [id, lat, lng] = line.split(',');
                    return { id: id?.trim() || '', lat: Number(lat), lng: Number(lng) };
                  }).filter(c => c.id && !isNaN(c.lat) && !isNaN(c.lng))
                );
              }}
            />
            <span>Bán kính (m):</span>
            <input
              type="number"
              className="border rounded px-2 py-1 w-20"
              min={1}
              max={10000}
              value={geoRadius}
              onChange={e => setGeoRadius(Number(e.target.value))}
            />
            <button
              className="px-3 py-1 rounded bg-orange-500 text-white hover:bg-orange-600 text-sm shadow"
              onClick={handleGeofencing}
              disabled={geoLoading || !geoCenters.length}
            >
              {geoLoading ? 'Đang kiểm tra...' : 'Kiểm tra rào địa lý'}
            </button>
          </div>
          <div className="mb-2 text-gray-500 text-xs">Tâm rào địa lý là vị trí khách hàng hiện tại.</div>
          {geoError && <div className="text-red-500 mt-2">{geoError}</div>}
          {geoResult && (
            <div className="mt-2 bg-white rounded shadow p-2 text-sm max-h-40 overflow-auto">
              <div className="font-semibold mb-1">Kết quả kiểm tra:</div>
              <ol className="list-decimal ml-5">
                {geoResult.data.map((item, i) => (
                  <li key={i}>
                    ID: <b>{item.id}</b> - {item.inside ? <span className="text-green-600">Bên trong</span> : <span className="text-red-600">Bên ngoài</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>;
};
export default Support;