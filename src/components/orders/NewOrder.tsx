import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package2Icon, TruckIcon, MapPinIcon, ScaleIcon, CreditCardIcon, ClockIcon, XIcon } from 'lucide-react';
import { provinces } from '../../data/locationData';
import axios from '../../api/axios';
import { useAuth } from '../auth/AuthContext';
import { getProvinces, getDistrictsByProvinceCode, getWardsByDistrictCode } from 'sub-vn';
import roads from '../../data/roads.json';
import { Combobox } from '@headlessui/react';
import { toast } from 'react-toastify';
import DecoratedBorder from '../common/DecoratedBorder';
import '../common/DecoratedBorder.css';
import { ToastContainer } from 'react-toastify';
import { QRCodeSVG } from 'qrcode.react';

interface Address {
  address_id: string;
  type: 'delivery' | 'pickup';
  is_default: boolean;
  [key: string]: any;
}

interface OrderResponse {
  order_id?: string;
  order?: {
    order_id: string;
  };
  error?: string;
  cost_details?: any;
}

interface PaymentResponse {
  paymentUrl?: string;
  error?: string;
}

const calculateShippingFee = (serviceType: string, weight: number, dimensions: {
  length: number;
  width: number;
  height: number;
}, senderProvince: string, receiverProvince: string) => {
  // Trọng lượng quy đổi từ thể tích (theo chuẩn ngành: DxRxC/6000)
  const volumetricWeight = (dimensions.length * dimensions.width * dimensions.height) / 6000;
  const chargeableWeight = Math.max(weight, volumetricWeight);
  const baseRates = {
    fast: 35000,
    standard: 25000,
    save: 20000
  };
  const weightFee = Math.ceil(chargeableWeight) * 5000; // Ví dụ: 5.000đ/kg
  let distanceFee = 0;
  if (senderProvince !== receiverProvince) {
    distanceFee = 20000;
  }
  const totalFee = baseRates[serviceType as keyof typeof baseRates] + weightFee + distanceFee;
  return { totalFee, weightFee, chargeableWeight };
};

const VIETMAP_API_KEY = '7f9ef35866466886ebd24ba5091eda803732c8c76cde1b4a';

async function fetchVietMapAutocomplete(text: string, focus?: string): Promise<any[]> {
  try {
    const params: any = { text };
    if (focus) params.focus = focus;
    const res = await axios.get('/vietmap/autocomplete', { params });
    return res.data as any[];
  } catch (err: any) {
    if (err.response?.status === 429 || err.response?.status === 451) {
      toast.error('Bạn thao tác quá nhanh hoặc vượt giới hạn tra cứu, vui lòng thử lại sau!');
    } else {
      console.warn('Không thể lấy gợi ý địa chỉ, vui lòng thử lại!', err);
    }
    return [];
  }
}

async function fetchVietMapPlace(refid: string): Promise<any> {
  const res = await axios.get('/vietmap/place', { params: { refid } });
  return res.data;
}

const NewOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    sender: {
      name: '',
      phone: '',
      address: ''
    },
    receiver: {
      name: '',
      phone: '',
      address: ''
    },
    package: {
      type: '',
      value: '',
      description: '',
      dimensions: {
        length: '',
        width: '',
        height: ''
      },
      weight: ''
    },
    service: {
      type: '',
      estimatedTime: '',
      paymentMethod: ''
    }
  });
  const [pricing, setPricing] = useState({
    shippingFee: 35000,
    distanceFee: 0,
    overweightFee: 0,
    packageFee: 0,
    surcharge: 0,
    discount: 0,
    total: 45000,
    waitFee: 0,
    weightFee: 0,
    peakFee: 0,
    additionalFee: 0,
    platformFee: 0,
    serviceFee: 0
  });
  const [coupon, setCoupon] = useState({
    code: '',
    applied: false,
    type: '',
    value: 0
  });
  const [senderLocation, setSenderLocation] = useState({ province: '', district: '', ward: '' });
  const [receiverLocation, setReceiverLocation] = useState({ province: '', district: '', ward: '' });
  const [dimensions, setDimensions] = useState({
    length: 0,
    width: 0,
    height: 0
  });
  const [weight, setWeight] = useState(0);
  const [serviceType, setServiceType] = useState('standard');
  const [warehouseId, setWarehouseId] = useState('');
  const [pickupAddresses, setPickupAddresses] = useState<Address[]>([]);
  const [deliveryAddresses, setDeliveryAddresses] = useState<Address[]>([]);
  const [pickupAddressId, setPickupAddressId] = useState('');
  const [deliveryAddressId, setDeliveryAddressId] = useState('');
  const [userCoupons, setUserCoupons] = useState<any[]>([]);
  const [selectedUserCouponId, setSelectedUserCouponId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [fragileFee, setFragileFee] = useState(0);
  const [bulkyFee, setBulkyFee] = useState(0);
  const selectedSenderProvince = provinces.find(p => p.id === senderLocation.province);
  const selectedSenderDistrict = selectedSenderProvince?.districts.find(d => d.id === senderLocation.district);
  const selectedReceiverProvince = provinces.find(p => p.id === receiverLocation.province);
  const selectedReceiverDistrict = selectedReceiverProvince?.districts.find(d => d.id === receiverLocation.district);
  const availableCoupons = [{
    code: 'FREESHIP',
    desc: 'Miễn phí vận chuyển',
    value: 35000,
    type: 'fixed',
    minOrder: 200000
  }, {
    code: 'SALE50K',
    desc: 'Giảm 50,000đ',
    value: 50000,
    type: 'fixed',
    minOrder: 300000
  }, {
    code: 'NEWYEAR',
    desc: 'Giảm 10% tổng đơn',
    value: 10,
    type: 'percentage',
    minOrder: 500000
  }];
  const calculateDiscount = (couponType: string, couponValue: number) => {
    const subtotal = pricing.shippingFee + pricing.packageFee;
    if (couponType === 'fixed') {
      return couponValue;
    } else if (couponType === 'percentage') {
      return Math.round(subtotal * couponValue / 100);
    }
    return 0;
  };
  const getTotalBeforeDiscount = () => {
    // Tổng trước giảm giá, gồm tất cả các loại phí
    return (
      pricing.shippingFee +
      pricing.packageFee +
      pricing.surcharge +
      pricing.serviceFee
    );
  };
  const handleApplyCoupon = () => {
    const selected = userCoupons.find(uc => uc.usercoupon_id === selectedUserCouponId);
    if (selected) {
      const couponType = selected.coupon.discount_type;
      const couponValue = selected.coupon.discount_value;
      const minOrder = selected.coupon.min_order_amount;
      const totalBeforeDiscount = getTotalBeforeDiscount();
      if (totalBeforeDiscount < minOrder) {
        toast.error(`Tổng phí đơn hàng phải từ ${minOrder.toLocaleString()}đ mới được áp dụng mã này!`);
        setCoupon({
          code: '',
          applied: false,
          type: '',
          value: 0
        });
        setSelectedUserCouponId('');
        return;
      }

      let discountAmount = 0;
      if (couponType === 'fixed') {
        discountAmount = couponValue;
      } else if (couponType === 'percent') {
        discountAmount = Math.round(totalBeforeDiscount * couponValue / 100);
      }
      setPricing(prev => ({
        ...prev,
        discount: discountAmount,
        total: totalBeforeDiscount - discountAmount
      }));
      setCoupon({
        code: selected.coupon.code,
        applied: true,
        type: couponType,
        value: couponValue
      });
    }
  };
  const handleRemoveCoupon = () => {
    setPricing(prev => ({
      ...prev,
      discount: 0,
      total: prev.shippingFee + prev.packageFee
    }));
    setCoupon({
      code: '',
      applied: false,
      type: '',
      value: 0
    });
    setSelectedUserCouponId('');
  };
  // Hàm chọn kho gần nhất với địa chỉ lấy hàng
  const findNearestWarehouse = (warehouses: any[], pickup: Address) => {
    // Ưu tiên cùng quận/huyện, cùng tỉnh/thành
    let best = warehouses.find(w => w.location.city === pickup.city && w.location.district === pickup.district);
    if (best) return best.warehouse_id;
    // Nếu không có, ưu tiên cùng tỉnh/thành
    best = warehouses.find(w => w.location.city === pickup.city);
    if (best) return best.warehouse_id;
    // Nếu không có, lấy kho đầu tiên
    return warehouses[0]?.warehouse_id;
  };
  const [isShippingFeeCalculated, setIsShippingFeeCalculated] = useState(false);
  const [momoWindow, setMomoWindow] = useState<Window | null>(null);
  const [estimatedTime, setEstimatedTime] = useState('');
  const handleCreateOrder = async () => {
    if (!isShippingFeeCalculated) {
      console.log('TOAST ERROR: Vui lòng ấn "Tính phí giao hàng" trước khi tạo đơn!');
      toast.error('Vui lòng ấn "Tính phí giao hàng" trước khi tạo đơn!');
      return;
    }
    if (!distance || distance <= 0) {
      console.log('TOAST ERROR: Vui lòng tính phí giao hàng trước khi tạo đơn!');
      toast.error('Vui lòng tính phí giao hàng trước khi tạo đơn!');
      return;
    }
    if (!isFullAddress(senderDetail, senderLocation) || !isFullAddress(receiverDetail, receiverLocation)) {
      console.log('TOAST ERROR: Vui lòng nhập đầy đủ số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành!');
      toast.error('Vui lòng nhập đầy đủ số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành!');
      return;
    }
    if (!validateStreet(senderDetail.street, senderRoads) || !validateStreet(receiverDetail.street, receiverRoads)) {
      return;
    }
    if (!formData.package.description || formData.package.description.trim() === '') {
      console.log('TOAST ERROR: Vui lòng nhập mô tả hàng hóa!');
      toast.error('Vui lòng nhập mô tả hàng hóa!');
      return;
    }
    // Kiểm tra coupon hợp lệ trước khi gửi
    let couponObj = null;
    if (selectedUserCouponId) {
      const selected = userCoupons.find(uc => uc.usercoupon_id === selectedUserCouponId);
      if (selected) {
        const minOrder = selected.coupon.min_order_amount;
        const totalBeforeDiscount = getTotalBeforeDiscount();
        if (totalBeforeDiscount < minOrder) {
          console.log('TOAST ERROR: Đơn hàng phải từ', minOrder, 'mới được áp dụng mã này!');
          toast.error(`Tổng phí đơn hàng phải từ ${minOrder.toLocaleString()}đ mới được áp dụng mã này!`, { autoClose: 4000, pauseOnHover: true });
          setCoupon({ code: '', applied: false, type: '', value: 0 });
          setSelectedUserCouponId('');
          return;
        } else {
          couponObj = selected;
        }
      }
    }
    try {
      // Lấy địa chỉ thực tế
      const pickup = pickupAddresses.find(a => a.address_id === pickupAddressId);
      const delivery = deliveryAddresses.find(a => a.address_id === deliveryAddressId);
      if (!pickup || !delivery) {
        console.log('TOAST ERROR: Bạn cần chọn địa chỉ lấy hàng và giao hàng!');
        toast.error('Bạn cần chọn địa chỉ lấy hàng và giao hàng!');
        return;
      }
      // Validate địa chỉ phải có đủ trường city, ward, district, street
      const requiredFields = ['city', 'ward', 'district', 'street'];
      for (const field of requiredFields) {
        if (!pickup[field]) {
          alert('Địa chỉ lấy hàng thiếu thông tin: ' + field);
          return;
        }
        if (!delivery[field]) {
          alert('Địa chỉ giao hàng thiếu thông tin: ' + field);
          return;
        }
      }
      // Lấy danh sách kho và chọn kho gần nhất
      const warehouseRes = await axios.get('/warehouses');
      const warehouses = warehouseRes.data as any[];
      if (!warehouses || warehouses.length === 0) {
        alert('Không tìm thấy kho phù hợp!');
        return;
      }
      const nearestWarehouseId = warehouseId || findNearestWarehouse(warehouses, pickup);
      // Lấy dữ liệu hàng hóa từ form
      const itemDescription = formData.package.description;
      const itemType = formData.package.type;
      const itemQuantity = 1; // Nếu có input số lượng thì lấy từ input
      const orderValue = Number(formData.package.value) || 0;
      // Validate thông tin người nhận
      if (!receiverDetail.name || !receiverDetail.phone || !receiverDetail.street || !receiverLocation.province || !receiverLocation.district || !receiverLocation.ward) {
        toast.error('Vui lòng nhập đầy đủ thông tin người nhận: họ tên, số điện thoại, tên đường, phường/xã, quận/huyện, tỉnh/thành!');
        return;
      }
      // Validate thông tin người gửi
      if (!senderDetail.name || !senderDetail.phone || !senderDetail.street || !senderLocation.province || !senderLocation.district || !senderLocation.ward) {
        toast.error('Vui lòng nhập đầy đủ thông tin người gửi: họ tên, số điện thoại, tên đường, phường/xã, quận/huyện, tỉnh/thành!');
        return;
      }
      const orderBody = {
        warehouse_id: nearestWarehouseId,
        pickup_address_id: pickup.address_id,
        delivery_address_id: delivery.address_id,
        pickup_address: {
          name: senderDetail.name,
          phone: senderDetail.phone,
          street: senderDetail.street,
          ward: getWardsByDistrictCode(senderLocation.district).find((w: any) => w.code === senderLocation.ward)?.name || '',
          district: getDistrictsByProvinceCode(senderLocation.province).find((d: any) => d.code === senderLocation.district)?.name || '',
          city: getProvinces().find((p: any) => p.code === senderLocation.province)?.name || '',
          email: senderDetail.email || '',
          note: senderDetail.note || ''
        },
        delivery_address: {
          name: receiverDetail.name,
          phone: receiverDetail.phone,
          street: receiverDetail.street,
          ward: getWardsByDistrictCode(receiverLocation.district).find((w: any) => w.code === receiverLocation.ward)?.name || '',
          district: getDistrictsByProvinceCode(receiverLocation.province).find((d: any) => d.code === receiverLocation.district)?.name || '',
          city: getProvinces().find((p: any) => p.code === receiverLocation.province)?.name || '',
          email: receiverDetail.email || '',
          note: receiverDetail.note || ''
        },
        weight: weight,
        dimensions: `${dimensions.length}x${dimensions.width}x${dimensions.height}`,
        order_items: [
          {
            description: itemDescription,
            quantity: itemQuantity,
            item_type: itemType,
          }
        ],
        service_type: serviceType,
        order_value: orderValue,
        estimate_time: estimatedTime ? new Date(estimatedTime).toISOString() : undefined,
        payment_method: paymentMethod,
        payment_status: 'pending',
        shipping_fee: pricing.shippingFee,
        service_fee: pricing.serviceFee,
        package_fee: pricing.packageFee,
        surcharge: pricing.surcharge,
        discount: pricing.discount,
        total_fee: pricing.total,
        pricing: { ...pricing },
        distance: distance,
        ...(couponObj && couponObj.coupon && couponObj.coupon.coupon_id
          ? { coupon_id: couponObj.coupon.coupon_id }
          : {}),
      };
      console.log('orderBody gửi lên:', orderBody);
      if (paymentMethod === 'COD') {
        // Tạo đơn như cũ
        const res = await axios.post<OrderResponse>('/orders', orderBody);
        const data = res.data;
        if (data?.order_id || data?.order?.order_id) {
          setOrderSuccess({
            ...orderBody,
            pickup,
            delivery,
            order_id: data.order_id || data.order?.order_id,
            pricing: { ...pricing }
          });
          toast.success('Tạo đơn hàng thành công!');
        } else {
          console.log('TOAST ERROR: Không lấy được mã đơn hàng!');
          toast.error('Không lấy được mã đơn hàng!');
        }
      } else if (paymentMethod === 'MOMO') {
        // 1. Tạo đơn hàng trước
        const resOrder = await axios.post<OrderResponse>('/orders', orderBody);
        const orderData = resOrder.data;
        const orderId = orderData?.order_id || orderData?.order?.order_id;
        const amount = pricing.total;
        if (!orderId) {
          console.log('TOAST ERROR:', orderData?.error || 'Không lấy được mã đơn hàng để thanh toán!');
          toast.error(orderData?.error || 'Không lấy được mã đơn hàng để thanh toán!');
          return;
        }
        // 2. Gọi API thanh toán Momo thật
        const resPay = await axios.post<PaymentResponse>('/payments', {
          order_id: orderId,
          amount: amount,
          payment_type: 'prepaid',
          method: 'momo'
        });
        const payUrl = resPay.data?.paymentUrl;
        if (payUrl) {
          const popup = window.open(payUrl, 'MomoPayment', 'width=500,height=700');
          setMomoWindow(popup);
        } else {
          console.log('TOAST ERROR: Không lấy được link thanh toán Momo!');
          toast.error('Không lấy được link thanh toán Momo!');
        }
      } else {
        console.log('TOAST ERROR: Phương thức thanh toán chưa hỗ trợ!');
        toast.error('Phương thức thanh toán chưa hỗ trợ!');
      }
    } catch (error: any) {
      console.error('Lỗi tạo đơn hàng:', error);
      if (error?.response?.data) {
        console.log('Chi tiết lỗi backend:', error.response.data);
        console.log('TOAST ERROR:', error.response.data.error || error.response.data.message || JSON.stringify(error.response.data));
        toast.error(
          error.response.data.error ||
          error.response.data.message ||
          JSON.stringify(error.response.data) ||
          error.message ||
        'Có lỗi khi tạo đơn hàng!'
      );
      } else {
        console.log('TOAST ERROR:', error.message || 'Có lỗi khi tạo đơn hàng!');
        toast.error(error.message || 'Có lỗi khi tạo đơn hàng!');
      }
    }
  };
  useEffect(() => {
    // Fetch địa chỉ
    const fetchAddresses = async () => {
      const res = await axios.get('/user-addresses');
      const addresses = res.data as any as Address[];
      setPickupAddresses(addresses.filter(a => a.type === 'pickup'));
      setDeliveryAddresses(addresses.filter(a => a.type === 'delivery'));
      const pickupDefault = addresses.find(a => a.type === 'pickup' && a.is_default);
      const deliveryDefault = addresses.find(a => a.type === 'delivery' && a.is_default);
      if (pickupDefault) setPickupAddressId(pickupDefault.address_id);
      if (deliveryDefault) setDeliveryAddressId(deliveryDefault.address_id);
    };
    // Fetch warehouse list
    const fetchWarehouses = async () => {
      const res = await axios.get('/warehouses');
      setWarehouseList(res.data as any[]);
    };
    // Fetch coupon
    const fetchCoupons = async () => {
      if (user?.user_id) {
        const res = await axios.get(`/user-coupons?user_id=${user.user_id}`);
        setUserCoupons((res.data as any[]).filter((uc: any) => uc.coupon && uc.coupon.is_active));
      }
    };
    fetchAddresses();
    fetchWarehouses();
    fetchCoupons();
  }, [user]);
  // Thêm state cho các thông số tính phí động
  const [distance, setDistance] = useState(1); // số km
  const [loadingDistance, setLoadingDistance] = useState(false);
  const [waitingTime, setWaitingTime] = useState(0); // phút
  const [isPeakHour, setIsPeakHour] = useState(false);
  // Tham số phí
  const BASE_FEE = 5000;
  const PER_KM_FEE = 1000;
  const FREE_WAIT_MIN = 5;
  const WAIT_FEE_PER_MIN = 500;
  const FREE_WEIGHT_KG = 5;
  const OVER_WEIGHT_FEE_PER_KG = 500;
  const PEAK_HOUR_RATE = 0.05;
  // State cho địa chỉ động
  const [senderDetail, setSenderDetail] = useState({
    name: '', phone: '', street: '', province: '', district: '', ward: '', email: '', note: ''
  });
  const [receiverDetail, setReceiverDetail] = useState({
    name: '', phone: '', street: '', province: '', district: '', ward: '', email: '', note: ''
  });
  // Hàm lấy code từ name
  const findProvinceCode = (name: string) => getProvinces().find((p: any) => p.name === name)?.code || '';
  const findDistrictCode = (provinceCode: string, name: string) => getDistrictsByProvinceCode(provinceCode).find((d: any) => d.name === name)?.code || '';
  const findWardCode = (districtCode: string, name: string) => getWardsByDistrictCode(districtCode).find((w: any) => w.name === name)?.code || '';
  const fillSenderDefault = () => {
    const def = pickupAddresses.find(a => a.is_default);
    if (def) {
      const provinceCode = findProvinceCode(def.city);
      const districtCode = findDistrictCode(provinceCode, def.district);
      const wardCode = findWardCode(districtCode, def.ward);
      setSenderDetail({
        name: def.name, phone: def.phone, street: def.street,
        province: def.city, district: def.district, ward: def.ward,
        email: def.email || '',
        note: def.note || ''
      });
      setSenderLocation({ province: provinceCode, district: districtCode, ward: wardCode });
    }
  };
  const fillReceiverDefault = () => {
    const def = deliveryAddresses.find(a => a.is_default);
    if (def) {
      const provinceCode = findProvinceCode(def.city);
      const districtCode = findDistrictCode(provinceCode, def.district);
      const wardCode = findWardCode(districtCode, def.ward);
      setReceiverDetail({
        name: def.name, phone: def.phone, street: def.street,
        province: def.city, district: def.district, ward: def.ward,
        email: def.email || '',
        note: def.note || ''
      });
      setReceiverLocation({ province: provinceCode, district: districtCode, ward: wardCode });
    }
  };
  // Thay thế hàm buildFullAddress để luôn build đúng format
  function cleanName(name: string) {
    if (!name) return '';
    for (const prefix of ["Tỉnh ", "Thành phố ", "TP. ", "Huyện ", "Quận ", "Xã ", "Phường ", "Thị trấn "]) {
      if (name.startsWith(prefix)) return name.slice(prefix.length);
    }
    return name;
  }

  const buildFullAddress = (detail: any, location: any) => {
    const provinceObj = getProvinces().find((p: any) => p.code === location.province);
    const districtObj = getDistrictsByProvinceCode(location.province).find((d: any) => d.code === location.district);
    const wardObj = getWardsByDistrictCode(location.district).find((w: any) => w.code === location.ward);
    const provinceName = provinceObj?.name || '';
    const districtName = districtObj?.name || '';
    const wardName = wardObj?.name || '';
    return `${wardName}, ${districtName}, ${provinceName}`;
  };

  // Hàm kiểm tra địa chỉ đầy đủ
  function isFullAddress(detail: any, location: any) {
    return (
      location.province && location.district && location.ward
    );
  }
  // State cho danh sách tên đường
  const [senderRoads, setSenderRoads] = useState<string[]>([]);
  const [receiverRoads, setReceiverRoads] = useState<string[]>([]);

  // Thêm cache và debounce cho fetchRoadsFromOverpass
  const roadsCache = new Map<string, string[]>();
  let debounceTimeout: any = null;

  // Đặt buildQuery ra ngoài để tránh redeclare
    const buildQuery = (areaName: string) => `
      [out:json][timeout:25];
      area["name:vi"="${areaName}"];
      (
        way(area)["highway"="motorway"];
        way(area)["highway"="trunk"];
        way(area)["highway"="primary"];
        way(area)["highway"="secondary"];
        way(area)["highway"="tertiary"];
        way(area)["highway"="residential"];
        way(area)["highway"="service"];
        way(area)["highway"="living_street"];
        way(area)["highway"="pedestrian"];
        way(area)["highway"="footway"];
        way(area)["highway"="path"];
      );
      out body;
      >;
      out skel qt;
    `;

  const fetchRoadsFromOverpass = async (province: string, district: string, ward: string) => {
    const cacheKey = `${province}|${district}|${ward}`;
    if (roadsCache.has(cacheKey)) {
      return roadsCache.get(cacheKey);
    }
    if (debounceTimeout) clearTimeout(debounceTimeout);
    return new Promise<string[]>((resolve) => {
      debounceTimeout = setTimeout(async () => {
        try {
          let roads: string[] = [];
          // Ưu tiên ward, nếu không có thì thử district, nếu không có thì thử province
          for (const areaName of [ward, district, province]) {
            if (!areaName) continue;
        const response = await axios.post('https://overpass-api.de/api/interpreter', buildQuery(areaName), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const data = response.data as { elements: Array<{ tags: { name?: string, highway?: string } }> };
            roads = data.elements
          .map(el => el.tags.name)
          .filter((name): name is string => {
            if (!name) return false;
            if (name.length < 2) return false;
            if (!/[a-zA-ZÀ-ỹ]/.test(name)) return false;
            return true;
          });
            if (roads.length) break;
      }
    // Loại trùng, sắp xếp ưu tiên Đường > Phố > khác
    roads = roads.filter((name, idx, arr) => arr.indexOf(name) === idx)
      .sort((a, b) => {
        const typeA = a.toLowerCase().startsWith('đường') ? 1 : a.toLowerCase().startsWith('phố') ? 2 : 3;
        const typeB = b.toLowerCase().startsWith('đường') ? 1 : b.toLowerCase().startsWith('phố') ? 2 : 3;
        if (typeA !== typeB) return typeA - typeB;
        return a.localeCompare(b, 'vi');
      });
          roadsCache.set(cacheKey, roads);
          resolve(roads);
        } catch (e: any) {
          if (e?.response?.status === 429) {
            console.warn('Bạn thao tác quá nhanh hoặc đã vượt giới hạn tra cứu tên đường. Vui lòng thử lại sau!', e);
          } else {
            console.warn('Không thể lấy tên đường từ Overpass API!', e);
          }
          resolve([]);
        }
      }, 800); // debounce 800ms
    });
  };

  // Sửa useEffect khi chọn xã/phường gửi
  useEffect(() => {
    const provinceName = getProvinces().find((p: any) => p.code === senderLocation.province)?.name || '';
    const districtName = getDistrictsByProvinceCode(senderLocation.province).find((d: any) => d.code === senderLocation.district)?.name || '';
    const wardName = getWardsByDistrictCode(senderLocation.district).find((w: any) => w.code === senderLocation.ward)?.name || '';
    if (provinceName && districtName && wardName) {
      fetchRoadsFromOverpass(provinceName, districtName, wardName).then(roads => {
        setSenderRoads(roads || []);
      });
    }
  }, [senderLocation.ward, senderLocation.district, senderLocation.province]);
  // Sửa useEffect khi chọn xã/phường nhận
  useEffect(() => {
    const provinceName = getProvinces().find((p: any) => p.code === receiverLocation.province)?.name || '';
    const districtName = getDistrictsByProvinceCode(receiverLocation.province).find((d: any) => d.code === receiverLocation.district)?.name || '';
    const wardName = getWardsByDistrictCode(receiverLocation.district).find((w: any) => w.code === receiverLocation.ward)?.name || '';
    if (provinceName && districtName && wardName) {
      fetchRoadsFromOverpass(provinceName, districtName, wardName).then(roads => {
        setReceiverRoads(roads || []);
      });
    }
  }, [receiverLocation.ward, receiverLocation.district, receiverLocation.province]);

  // Thêm hàm validateStreet
  const validateStreet = (street: string, roads: string[]) => {
    if (!street || (roads.length && !roads.includes(street))) {
      toast.error('Vui lòng nhập lại đúng tên đường chính xác!');
      return false;
    }
    return true;
  };

  // Thêm hàm handleCalcDistance
  const handleCalcDistance = async () => {
    if (!isFullAddress(senderDetail, senderLocation) || !isFullAddress(receiverDetail, receiverLocation)) {
      toast.error('Vui lòng chọn đầy đủ tỉnh/thành, quận/huyện, xã/phường!');
      return;
    }
    setLoadingDistance(true);
    try {
      const res = await axios.post('/vietmap/calc-shipping-fee', {
        sender: { province: senderLocation.province },
        receiver: { province: receiverLocation.province }
      });
      const data = res.data as { fee?: number; distance_km?: number; error?: string };
      if (typeof data.fee === 'number' && typeof data.distance_km === 'number') {
        setDistance(data.distance_km);
        setIsShippingFeeCalculated(true);
        setLoadingDistance(false);
        setPricing(prev => ({
          ...prev,
          distanceFee: Number(data.fee ?? 0),
          // shippingFee giữ nguyên, sẽ được tính realtime ở useEffect bên dưới
          total: Number(data.fee ?? 0) + prev.shippingFee + prev.packageFee + prev.surcharge + prev.serviceFee - prev.discount
        }));
        toast.success('Đã tính phí giao hàng từ backend!');
      } else {
        setLoadingDistance(false);
        setIsShippingFeeCalculated(false);
        toast.error(data.error || 'Không thể tính phí giao hàng với địa chỉ này!');
      }
    } catch (err: any) {
      setLoadingDistance(false);
      setIsShippingFeeCalculated(false);
      toast.error(err?.response?.data?.error || 'Không thể tính phí giao hàng với địa chỉ này!');
    }
  };

  useEffect(() => {
    // Phí ship theo khoảng cách (chỉ tính theo km)
    let distanceFee = typeof pricing.distanceFee === 'number' ? pricing.distanceFee : 0;
    // Phí vượt cân (chỉ tính phần vượt 3kg)
    let overweightFee = 0;
    if (weight > 3) {
      overweightFee = Math.round((weight - 3) * OVER_WEIGHT_FEE_PER_KG);
    }
    // Cước phí giao hàng = phí ship theo khoảng cách (backend) + phí vượt cân
    const shippingFee = distanceFee + overweightFee;
    // Phụ thu (cồng kềnh, dễ vỡ)
    const surcharge = fragileFee + bulkyFee;
    // Phí dịch vụ vận chuyển
    let serviceFee = 0;
    if (serviceType === 'fast') serviceFee = 5000;
    else if (serviceType === 'standard') serviceFee = 2000;
    else serviceFee = 0;
    // Tổng trước giảm giá (tổng tất cả các phí nhỏ)
    const subtotal = shippingFee + serviceFee + surcharge;
    // Giảm giá
    const discount = coupon.applied
      ? (coupon.type === 'percent'
          ? Math.round(subtotal * coupon.value / 100)
          : coupon.value)
      : 0;
    // Tổng cuối cùng
    const total = subtotal - discount;
    setPricing(prev => ({
      ...prev,
      shippingFee: Math.round(shippingFee),
      distanceFee: Math.round(distanceFee),
      overweightFee: Math.round(overweightFee),
      packageFee: 0,
      surcharge: Math.round(surcharge),
      discount: Math.round(discount),
      total: Math.round(total),
      waitFee: 0,
      weightFee: 0,
      peakFee: 0,
      additionalFee: 0,
      platformFee: 0,
      serviceFee: Math.round(serviceFee)
    }));
  }, [weight, dimensions, serviceType, senderLocation.province, receiverLocation.province, fragileFee, bulkyFee, coupon, distance, pricing.distanceFee]);

  const [warehouseList, setWarehouseList] = useState<any[]>([]);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);

  // Modal hiển thị chi tiết đơn hàng thành công
  const renderOrderSuccessModal = () => {
    if (!orderSuccess) return null;
    const p = orderSuccess.pricing || {};
    return (
      <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.3)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{background:'#fff',borderRadius:12,padding:32,minWidth:400,maxWidth:600,boxShadow:'0 4px 32px #0002'}}>
          <h2 style={{fontSize:22,fontWeight:700,marginBottom:16,color:'#f97316'}}>Tạo đơn hàng thành công!</h2>
          <table style={{width:'100%',marginBottom:16}}>
            <tbody>
              {orderSuccess.order_id && <tr><td style={{fontWeight:600}}>Mã đơn hàng:</td><td>{orderSuccess.order_id}</td></tr>}
              <tr><td style={{fontWeight:600}}>Người gửi:</td><td>{orderSuccess.pickup_address?.name || ''} - {orderSuccess.pickup_address?.phone || ''}</td></tr>
              <tr><td style={{fontWeight:600}}>Địa chỉ gửi:</td><td>{[orderSuccess.pickup_address?.street, orderSuccess.pickup_address?.ward, orderSuccess.pickup_address?.district, orderSuccess.pickup_address?.city].filter(Boolean).join(', ')}</td></tr>
              <tr><td style={{fontWeight:600}}>Người nhận:</td><td>{orderSuccess.delivery_address?.name || ''} - {orderSuccess.delivery_address?.phone || ''}</td></tr>
              <tr><td style={{fontWeight:600}}>Địa chỉ nhận:</td><td>{[orderSuccess.delivery_address?.street, orderSuccess.delivery_address?.ward, orderSuccess.delivery_address?.district, orderSuccess.delivery_address?.city].filter(Boolean).join(', ')}</td></tr>
              <tr><td style={{fontWeight:600}}>Loại hàng:</td><td>{orderSuccess.order_items?.[0]?.item_type || ''}</td></tr>
              <tr><td style={{fontWeight:600}}>Mô tả:</td><td>{orderSuccess.order_items?.[0]?.description || ''}</td></tr>
              <tr><td style={{fontWeight:600}}>Khối lượng:</td><td>{orderSuccess.weight} kg</td></tr>
              <tr><td style={{fontWeight:600}}>Kích thước:</td><td>{orderSuccess.dimensions}</td></tr>
              <tr><td style={{fontWeight:600}}>Dịch vụ:</td><td>{orderSuccess.service_type}</td></tr>
              <tr><td style={{fontWeight:600}}>Cước phí giao hàng:</td><td>{p.shippingFee?.toLocaleString()}đ</td></tr>
              <tr><td style={{fontWeight:600}}>Phí dịch vụ vận chuyển:</td><td>{p.serviceFee?.toLocaleString()}đ</td></tr>
              <tr><td style={{fontWeight:600}}>Phí đóng gói:</td><td>{p.packageFee?.toLocaleString()}đ</td></tr>
              <tr><td style={{fontWeight:600}}>Phụ thu:</td><td>{p.surcharge?.toLocaleString()}đ</td></tr>
              <tr><td style={{fontWeight:600}}>Giảm giá:</td><td>{p.discount ? '-' + p.discount.toLocaleString() : 0}đ</td></tr>
              <tr><td style={{fontWeight:600}}>Tổng thanh toán:</td><td style={{color:'#f97316',fontWeight:700}}>{p.total?.toLocaleString()}đ</td></tr>
            </tbody>
          </table>
          {orderSuccess.order_id && (
  <div style={{
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    background: '#fff',
    padding: 8,
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  }}>
    <QRCodeSVG
      value={orderSuccess.order_id}
      size={100}
      level="H"
      includeMargin={true}
      bgColor="#ffffff"
      fgColor="#000000"
    />
    <div style={{ fontSize: 12, textAlign: 'center', marginTop: 4, color: '#666' }}>
      Mã đơn: {orderSuccess.order_id}
    </div>
  </div>
)}
          <div style={{display:'flex',justifyContent:'flex-end',gap:12}}>
            <button onClick={()=>{setOrderSuccess(null);navigate('/dashboard')}} style={{padding:'8px 24px',background:'#f97316',color:'#fff',border:'none',borderRadius:6,fontWeight:600,fontSize:16}}>Đóng</button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    // Lắng nghe kết quả thanh toán Momo từ popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.momoPayment === 'success') {
        toast.success('Thanh toán Momo thành công!');
        if (momoWindow) momoWindow.close();
        // Có thể gọi lại API lấy trạng thái đơn hàng hoặc cập nhật UI
        setOrderSuccess(null);
        navigate('/dashboard');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [momoWindow, navigate]);

  // State cho autocomplete đường
  const [senderStreetInput, setSenderStreetInput] = useState('');
  const [senderStreetSuggestions, setSenderStreetSuggestions] = useState<string[]>([]);
  const [receiverStreetInput, setReceiverStreetInput] = useState('');
  const [receiverStreetSuggestions, setReceiverStreetSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    if (senderStreetInput.length > 2) {
      fetchVietMapAutocomplete(senderStreetInput)
        .then((data) => {
          if (active) setSenderStreetSuggestions(Array.isArray(data) ? data.map(d => d.display) : []);
        })
        .catch(() => setSenderStreetSuggestions([]));
    } else {
      setSenderStreetSuggestions([]);
    }
    return () => { active = false; };
  }, [senderStreetInput]);

  useEffect(() => {
    let active = true;
    if (receiverStreetInput.length > 2) {
      fetchVietMapAutocomplete(receiverStreetInput)
        .then((data) => {
          if (active) setReceiverStreetSuggestions(Array.isArray(data) ? data.map(d => d.display) : []);
        })
        .catch(() => setReceiverStreetSuggestions([]));
    } else {
      setReceiverStreetSuggestions([]);
    }
    return () => { active = false; };
  }, [receiverStreetInput]);

  // Khi chọn địa chỉ lấy hàng
  useEffect(() => {
    const pickup = pickupAddresses.find(a => a.address_id === pickupAddressId);
    if (pickup) {
      const provinceCode = findProvinceCode(pickup.city);
      const districtCode = findDistrictCode(provinceCode, pickup.district);
      const wardCode = findWardCode(districtCode, pickup.ward);
      setSenderDetail({
        name: pickup.name,
        phone: pickup.phone,
        street: pickup.street,
        province: pickup.city,
        district: pickup.district,
        ward: pickup.ward,
        email: pickup.email || '',
        note: pickup.note || ''
      });
      setSenderLocation({ province: provinceCode, district: districtCode, ward: wardCode });
    }
  }, [pickupAddressId, pickupAddresses]);

  // Khi chọn địa chỉ giao hàng
  useEffect(() => {
    const delivery = deliveryAddresses.find(a => a.address_id === deliveryAddressId);
    if (delivery) {
      const provinceCode = findProvinceCode(delivery.city);
      const districtCode = findDistrictCode(provinceCode, delivery.district);
      const wardCode = findWardCode(districtCode, delivery.ward);
      setReceiverDetail({
        name: delivery.name,
        phone: delivery.phone,
        street: delivery.street,
        province: delivery.city,
        district: delivery.district,
        ward: delivery.ward,
        email: delivery.email || '',
        note: delivery.note || ''
      });
      setReceiverLocation({ province: provinceCode, district: districtCode, ward: wardCode });
    }
  }, [deliveryAddressId, deliveryAddresses]);

  useEffect(() => {
    if (coupon.applied && selectedUserCouponId) {
      const selected = userCoupons.find(uc => uc.usercoupon_id === selectedUserCouponId);
      if (selected) {
        const minOrder = selected.coupon.min_order_amount;
        const orderValue = Number(formData.package.value) || 0;
        if (orderValue < minOrder) {
          toast.error(`Tổng phí đơn hàng phải từ ${minOrder.toLocaleString()}đ mới được áp dụng mã này!`, { autoClose: 4000, pauseOnHover: true });
          setCoupon({
            code: '',
            applied: false,
            type: '',
            value: 0
          });
          setSelectedUserCouponId('');
        }
      }
    }
  }, [formData.package.value]);

  return (
    <div className="max-w-4xl mx-auto my-8 print:bg-white print:shadow-none print:border-none" style={{position: 'relative', background: '#fff', borderRadius: 18, boxShadow: '0 4px 32px 0 rgba(0,0,0,0.10)', border: '2px solid #ff9800', padding: 24, overflow: 'hidden'}}>
      {/* Hoa văn viền trên */}
      <div style={{width: '100%', height: 24, margin: '-24px -24px 12px -24px', overflow: 'hidden'}}>
        <svg width="100%" height="24" viewBox="0 0 1000 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 12 Q50 24 100 12 T200 12 T300 12 T400 12 T500 12 T600 12 T700 12 T800 12 T900 12 T1000 12 V24 H0Z" fill="#ffe0b2"/>
        </svg>
      </div>
      {/* Icon trang trí góc trên trái */}
      <img src="/icon-truck.svg" alt="truck" style={{position: 'absolute', left: 8, top: 8, width: 36, opacity: 0.18, zIndex: 1}} />
      {/* Icon trang trí góc trên phải */}
      <img src="/icon-gift.svg" alt="gift" style={{position: 'absolute', right: 8, top: 8, width: 32, opacity: 0.15, zIndex: 1}} />
      {/* Icon trang trí góc dưới trái */}
      <img src="/icon-star.svg" alt="star" style={{position: 'absolute', left: 8, bottom: 8, width: 28, opacity: 0.13, zIndex: 1}} />
      {/* Hoa văn viền dưới */}
      <div style={{width: '100%', height: 24, margin: '12px -24px -24px -24px', overflow: 'hidden'}}>
        <svg width="100%" height="24" viewBox="0 0 1000 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 12 Q50 0 100 12 T200 12 T300 12 T400 12 T500 12 T600 12 T700 12 T800 12 T900 12 T1000 12 V0 H0Z" fill="#ffe0b2"/>
        </svg>
      </div>
      <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tạo đơn hàng mới</h1>
        <p className="text-gray-500">Điền thông tin chi tiết để tạo đơn hàng</p>
      </div>
      <div className="space-y-6">
        <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium flex items-center gap-2 text-base md:text-lg">
                  <Package2Icon className="h-5 w-5 text-orange-500" />
                  Thông tin người gửi
                </h3>
                <button type="button" onClick={fillSenderDefault} className="px-2 py-1 text-xs bg-orange-100 text-orange-600 rounded ml-2">Lấy địa chỉ mặc định</button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên người gửi</label>
                  <input type="text" value={senderDetail.name} onChange={e => setSenderDetail(d => ({...d, name: e.target.value}))} placeholder="Họ tên người gửi" className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input type="tel" value={senderDetail.phone} onChange={e => setSenderDetail(d => ({...d, phone: e.target.value}))} placeholder="Số điện thoại" className="w-full p-2 border rounded-lg" />
                </div>
                <div className="space-y-3">
                  <select value={senderLocation.province} onChange={e => { setSenderLocation(l => ({...l, province: e.target.value, district: '', ward: ''})); setIsShippingFeeCalculated(false); }} className="w-full p-2 border rounded-lg">
                    <option value="">Chọn tỉnh/thành phố</option>
                    {getProvinces().map((p: any) => <option key={p.code} value={p.code}>{p.name}</option>)}
                  </select>
                  <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full p-2 border rounded-lg mt-2">
                    <option value="">Chọn kho hàng</option>
                    {warehouseList.filter(w => {
                      const clean = (s: string) => s?.toLowerCase().replace(/^tỉnh |^thành phố |^tp\.?\s*/i, '').trim();
                      const provinceName = clean(getProvinces().find((p: any) => p.code === senderLocation.province)?.name || '');
                      const cityName = clean(w.location?.city || '');
                      return cityName === provinceName;
                    }).map((w, idx) => {
                      const address = [w.location?.street, w.location?.ward, w.location?.district, w.location?.city].filter(Boolean).join(', ');
                      const available = (w.capacity ?? 0) - (w.current_load ?? 0);
                      return (
                        <option key={w.warehouse_id} value={w.warehouse_id}>
                          {`Kho ${idx + 1} - ${w.location?.city}`} {address ? `| ${address}` : ''} | Trống: {available}
                        </option>
                      );
                    })}
                  </select>
                  <select value={senderLocation.district} onChange={e => { setSenderLocation(l => ({...l, district: e.target.value, ward: ''})); setIsShippingFeeCalculated(false); }} className="w-full p-2 border rounded-lg" disabled={!senderLocation.province}>
                    <option value="">Chọn quận/huyện</option>
                    {getDistrictsByProvinceCode(senderLocation.province).map((d: any) => <option key={d.code} value={d.code}>{d.name}</option>)}
                  </select>
                  <select value={senderLocation.ward} onChange={e => { setSenderLocation(l => ({...l, ward: e.target.value})); setIsShippingFeeCalculated(false); }} className="w-full p-2 border rounded-lg" disabled={!senderLocation.district}>
                    <option value="">Chọn phường/xã</option>
                    {getWardsByDistrictCode(senderLocation.district).map((w: any) => <option key={w.code} value={w.code}>{w.name}</option>)}
                  </select>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên đường (autocomplete)</label>
                    <input
                      type="text"
                      value={senderStreetInput}
                      onChange={e => {
                        setSenderStreetInput(e.target.value);
                        setSenderDetail(d => ({ ...d, street: e.target.value }));
                      }}
                      className="w-full p-2 border rounded-lg"
                      placeholder="Nhập địa chỉ, tên đường..."
                      autoComplete="off"
                    />
                    {senderStreetSuggestions.length > 0 && (
                      <ul className="border bg-white rounded shadow max-h-40 overflow-y-auto">
                        {senderStreetSuggestions.map((suggestion, idx) => (
                          <li
                            key={idx}
                            className="px-3 py-1 hover:bg-orange-100 cursor-pointer"
                            onClick={() => {
                              setSenderStreetInput(suggestion);
                              setSenderDetail(d => ({ ...d, street: suggestion }));
                              setSenderStreetSuggestions([]);
                            }}
                          >
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium flex items-center gap-2 text-base md:text-lg">
                  <TruckIcon className="h-5 w-5 text-orange-500" />
                  Thông tin người nhận
                </h3>
                <button type="button" onClick={fillReceiverDefault} className="px-2 py-1 text-xs bg-orange-100 text-orange-600 rounded ml-2">Lấy địa chỉ mặc định</button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên người nhận</label>
                  <input type="text" value={receiverDetail.name} onChange={e => setReceiverDetail(d => ({...d, name: e.target.value}))} placeholder="Họ tên người nhận" className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input type="tel" value={receiverDetail.phone} onChange={e => setReceiverDetail(d => ({...d, phone: e.target.value}))} placeholder="Số điện thoại" className="w-full p-2 border rounded-lg" />
                </div>
                <div className="space-y-3">
                  <select value={receiverLocation.province} onChange={e => { setReceiverLocation(l => ({...l, province: e.target.value, district: '', ward: ''})); setIsShippingFeeCalculated(false); }} className="w-full p-2 border rounded-lg">
                    <option value="">Chọn tỉnh/thành phố</option>
                    {getProvinces().map((p: any) => <option key={p.code} value={p.code}>{p.name}</option>)}
                  </select>
                  <select value={receiverLocation.district} onChange={e => { setReceiverLocation(l => ({...l, district: e.target.value, ward: ''})); setIsShippingFeeCalculated(false); }} className="w-full p-2 border rounded-lg" disabled={!receiverLocation.province}>
                    <option value="">Chọn quận/huyện</option>
                    {getDistrictsByProvinceCode(receiverLocation.province).map((d: any) => <option key={d.code} value={d.code}>{d.name}</option>)}
                  </select>
                  <select value={receiverLocation.ward} onChange={e => { setReceiverLocation(l => ({...l, ward: e.target.value})); setIsShippingFeeCalculated(false); }} className="w-full p-2 border rounded-lg" disabled={!receiverLocation.district}>
                    <option value="">Chọn phường/xã</option>
                    {getWardsByDistrictCode(receiverLocation.district).map((w: any) => <option key={w.code} value={w.code}>{w.name}</option>)}
                  </select>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên đường (autocomplete)</label>
                    <input
                      type="text"
                      value={receiverStreetInput}
                      onChange={e => {
                        setReceiverStreetInput(e.target.value);
                        setReceiverDetail(d => ({ ...d, street: e.target.value }));
                      }}
                      className="w-full p-2 border rounded-lg"
                      placeholder="Nhập địa chỉ, tên đường..."
                      autoComplete="off"
                    />
                    {receiverStreetSuggestions.length > 0 && (
                      <ul className="border bg-white rounded shadow max-h-40 overflow-y-auto">
                        {receiverStreetSuggestions.map((suggestion, idx) => (
                          <li
                            key={idx}
                            className="px-3 py-1 hover:bg-orange-100 cursor-pointer"
                            onClick={() => {
                              setReceiverStreetInput(suggestion);
                              setReceiverDetail(d => ({ ...d, street: suggestion }));
                              setReceiverStreetSuggestions([]);
                            }}
                          >
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="font-medium flex items-center gap-2 text-lg mb-4">
            <MapPinIcon className="h-5 w-5 text-orange-500" />
            Thông tin hàng hóa
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại hàng hóa
                </label>
                <select value={formData.package.type} onChange={e => {
                  setFormData(f => ({
                    ...f,
                    package: {
                      ...f.package,
                      type: e.target.value
                    }
                  }));
                  // Tính phụ thu
                  if (e.target.value === 'Hàng dễ vỡ') {
                    setFragileFee(10000);
                    setBulkyFee(0);
                  } else if (e.target.value === 'Hàng cồng kềnh') {
                    setFragileFee(0);
                    setBulkyFee(20000);
                  } else {
                    setFragileFee(0);
                    setBulkyFee(0);
                  }
                }} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                  <option value="">Chọn loại hàng hóa</option>
                  <option value="Thực phẩm">Thực phẩm</option>
                  <option value="Quần áo">Quần áo</option>
                  <option value="Điện tử">Điện tử</option>
                  <option value="Hàng dễ vỡ">Hàng dễ vỡ</option>
                  <option value="Hàng cồng kềnh">Hàng cồng kềnh</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giá trị hàng hóa
                </label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Nhập giá trị hàng hóa"
                    value={formData.package.value}
                    onChange={e => setFormData(f => ({
                      ...f,
                      package: {
                        ...f.package,
                        value: e.target.value
                      }
                    }))}
                  />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả hàng hóa
                </label>
                <textarea
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows={2}
                  placeholder="Mô tả chi tiết hàng hóa"
                  value={formData.package.description}
                  onChange={e => setFormData(f => ({
                    ...f,
                    package: {
                      ...f.package,
                      description: e.target.value
                    }
                  }))}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kích thước (DxRxC cm)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" value={dimensions.length === 0 ? '' : dimensions.length} onChange={e => setDimensions(prev => ({
                  ...prev,
                  length: e.target.value === '' ? 0 : Number(e.target.value)
                }))} placeholder="Dài" className="p-2 border rounded" />
                  <input type="number" value={dimensions.width === 0 ? '' : dimensions.width} onChange={e => setDimensions(prev => ({
                  ...prev,
                  width: e.target.value === '' ? 0 : Number(e.target.value)
                }))} placeholder="Rộng" className="p-2 border rounded" />
                  <input type="number" value={dimensions.height === 0 ? '' : dimensions.height} onChange={e => setDimensions(prev => ({
                  ...prev,
                  height: e.target.value === '' ? 0 : Number(e.target.value)
                }))} placeholder="Cao" className="p-2 border rounded" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trọng lượng (kg)
                </label>
                <input type="number" value={weight === 0 ? '' : weight} onChange={e => setWeight(e.target.value === '' ? 0 : Number(e.target.value))} className="p-2 border rounded w-full" />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="font-medium flex items-center gap-2 text-lg mb-4">
            <CreditCardIcon className="h-5 w-5 text-orange-500" />
            Dịch vụ & Thanh toán
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dịch vụ vận chuyển
                </label>
                <select value={serviceType} onChange={e => setServiceType(e.target.value)} className="w-full p-2 border rounded-lg">
                  <option value="fast">Giao hàng hỏa tốc (2-3h)</option>
                  <option value="standard">Giao hàng tiêu chuẩn (24h)</option>
                  <option value="save">Giao hàng tiết kiệm (48h)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thời gian lấy hàng dự kiến
                </label>
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                    <input
                      type="datetime-local"
                      className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      value={estimatedTime}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={e => {
                        const val = e.target.value;
                        const now = new Date();
                        now.setSeconds(0, 0);
                        const picked = new Date(val);
                        if (picked < now) {
                          toast.error('Ngày lấy hàng không được nhỏ hơn ngày hiện tại!');
                          setEstimatedTime('');
                        } else {
                          setEstimatedTime(val);
                        }
                      }}
                    />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phương thức thanh toán
                </label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full p-2 border rounded-lg">
                  <option value="COD">COD - Thu hộ</option>
                  <option value="MOMO">Momo</option>
                  <option value="ZALOPAY">ZaloPay</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã giảm giá</label>
                <div className="flex flex-col md:flex-row gap-2">
                  <select value={selectedUserCouponId} onChange={e => setSelectedUserCouponId(e.target.value)} className="flex-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" disabled={!!coupon.applied}>
                    <option value="">Chọn mã giảm giá</option>
                    {userCoupons.map(uc => (
                      <option key={uc.usercoupon_id} value={uc.usercoupon_id}>
                        {uc.coupon.code} - {uc.coupon.discount_type === 'percent' ? `Giảm ${uc.coupon.discount_value}%` : `Giảm ${uc.coupon.discount_value.toLocaleString()}đ`}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2 mt-2 md:mt-0 w-full md:w-auto">
                    {!coupon.applied && selectedUserCouponId && (
                      <button type="button" onClick={() => handleApplyCoupon()} className="w-full md:w-auto px-4 py-2 rounded-lg text-white bg-orange-500 hover:bg-orange-600">Áp dụng</button>
                    )}
                    {coupon.applied && (
                      <button type="button" onClick={handleRemoveCoupon} className="w-full md:w-auto px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 flex items-center gap-2">
                        <XIcon className="h-4 w-4" /> Hủy
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Phí ship theo khoảng cách ({distance} km):</span>
                <span>{pricing.distanceFee?.toLocaleString()}đ</span>
              </div>
              {pricing.overweightFee > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Phí vượt cân:</span>
                  <span>{pricing.overweightFee.toLocaleString()}đ</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Cước phí giao hàng:</span>
                <span>{pricing.shippingFee?.toLocaleString()}đ</span>
              </div>
              {pricing.serviceFee > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Phí dịch vụ vận chuyển:</span>
                  <span>{pricing.serviceFee.toLocaleString()}đ</span>
                </div>
              )}
              {pricing.surcharge > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Phụ thu:</span>
                  <span>{pricing.surcharge.toLocaleString()}đ</span>
                </div>
              )}
              {selectedUserCouponId && <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Giảm giá:</span>
                  <span className="text-green-600">
                    -{pricing.discount.toLocaleString()}đ
                  </span>
                </div>}
              <div className="flex justify-between items-center font-medium text-lg pt-2 border-t mt-2">
                <span>Tổng thanh toán:</span>
                <span className="text-orange-500">
                  {pricing.total.toLocaleString()}đ
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <button className="px-6 py-2 border rounded-lg hover:bg-gray-50">
            Hủy
          </button>
          <button onClick={handleCalcDistance} className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Tính phí giao hàng
          </button>
          <button onClick={handleCreateOrder} className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
            Tạo đơn hàng
          </button>
          </div>
        </div>
      </div>
      {loadingDistance && <div className="text-orange-500 text-sm">Đang tính khoảng cách thực tế...</div>}
      {renderOrderSuccessModal()}
      <ToastContainer style={{ zIndex: 999999 }} />
    </div>
  );
};

export default NewOrder;