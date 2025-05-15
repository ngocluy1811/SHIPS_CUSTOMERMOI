import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package2Icon, TruckIcon, MapPinIcon, PhoneIcon, NavigationIcon, XIcon } from 'lucide-react';
import axios from '../../api/axios';
import { toast } from 'react-toastify';
import { io, Socket } from 'socket.io-client';

interface Order {
  order_id: string;
  status: string;
  delivery_address: {
    lat: number;
    lng: number;
    street: string;
    ward: string;
    district: string;
    city: string;
  };
  customer: {
    name: string;
    phone: string;
  };
}

const ShipperOrderDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Fetch order details
  const fetchOrder = async () => {
    try {
      const response = await axios.get<Order>(`/orders/${id}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Không thể tải thông tin đơn hàng');
    }
  };

  // Initialize socket connection
  useEffect(() => {
    const socket = io('http://localhost:3000', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      if (id) {
        socket.emit('join_order_room', id);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [id]);

  // Start location tracking
  const startTracking = async () => {
    if (!order || order.status !== 'delivering') {
      toast.error('Chỉ có thể chỉ đường khi đơn hàng đang giao');
      return;
    }

    try {
      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      setCurrentLocation(location);

      // Emit start tracking event via socket
      if (socketRef.current?.connected) {
        socketRef.current.emit('shipper_start_tracking', {
          order_id: order.order_id,
          shipper_id: localStorage.getItem('user_id'),
        });
      }

      // Start watching location
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(newLocation);

          // Update location via socket
          if (socketRef.current?.connected) {
            socketRef.current.emit('shipper_location_update', {
              order_id: order.order_id,
              shipper_id: localStorage.getItem('user_id'),
              location: newLocation
            });
          }
        },
        (error) => {
          console.error('Error watching location:', error);
          toast.error('Không thể theo dõi vị trí');
          stopTracking();
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );

      setIsTracking(true);
      toast.success('Đã bắt đầu chỉ đường');

    } catch (error) {
      console.error('Error starting tracking:', error);
      toast.error('Không thể bắt đầu chỉ đường');
    }
  };

  // Stop location tracking
  const stopTracking = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (order) {
      // Emit stop tracking event via socket
      if (socketRef.current?.connected) {
        socketRef.current.emit('shipper_stop_tracking', {
          order_id: order.order_id,
          shipper_id: localStorage.getItem('user_id'),
        });
      }
      setIsTracking(false);
      setCurrentLocation(null);
      toast.info('Đã dừng chỉ đường');
    }
  };

  // Check initial tracking status
  useEffect(() => {
    const checkTrackingStatus = async () => {
      try {
        const response = await axios.get<{
          status: string;
          location?: { lat: number; lng: number };
        }>(`/tracking/${id}`);
        setIsTracking(response.data.status === 'active');
        if (response.data.location) {
          setCurrentLocation(response.data.location);
        }
      } catch (error) {
        console.error('Error checking tracking status:', error);
      }
    };

    if (id) {
      checkTrackingStatus();
    }
  }, [id]);

  // Fetch order on mount
  useEffect(() => {
    fetchOrder();
  }, [id]);

  if (!order) {
    return <div className="text-center py-8">Đang tải thông tin đơn hàng...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package2Icon className="h-6 w-6 text-orange-500" />
            Chi tiết đơn hàng #{order.order_id}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/shipper/orders')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              <XIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Order Status */}
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="font-medium text-orange-700">
              Trạng thái: {order.status === 'delivering' ? 'Đang giao' : order.status}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="font-medium flex items-center gap-2 mb-2">
              <MapPinIcon className="h-5 w-5 text-gray-500" />
              Địa chỉ giao hàng
            </h2>
            <p className="text-gray-700">
              {order.delivery_address.street}, {order.delivery_address.ward}, {order.delivery_address.district}, {order.delivery_address.city}
            </p>
          </div>

          {/* Customer Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="font-medium flex items-center gap-2 mb-2">
              <PhoneIcon className="h-5 w-5 text-gray-500" />
              Thông tin người nhận
            </h2>
            <p className="text-gray-700">{order.customer.name}</p>
            <p className="text-gray-700">{order.customer.phone}</p>
          </div>

          {/* Navigation Button */}
          {order.status === 'delivering' && (
            <div className="mt-6">
              {!isTracking ? (
                <button
                  onClick={startTracking}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  <NavigationIcon className="h-5 w-5" />
                  Chỉ đường tới đơn này
                </button>
              ) : (
                <button
                  onClick={stopTracking}
                  className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center gap-2"
                >
                  <XIcon className="h-5 w-5" />
                  Dừng chỉ đường
                </button>
              )}
            </div>
          )}

          {/* Map Preview */}
          {isTracking && currentLocation && (
            <div className="mt-6">
              <div className="h-96 bg-gray-100 rounded-lg">
                {/* Add your map component here */}
                <div className="p-4 text-center text-gray-500">
                  Vị trí hiện tại: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShipperOrderDetail; 