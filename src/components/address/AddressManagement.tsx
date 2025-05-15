import React, { useState, useEffect } from 'react';
import { MapPinIcon, PlusIcon, StarIcon, PencilIcon, TrashIcon } from 'lucide-react';
import AddAddressModal from '../modals/AddAddressModal';
import axios from '../../api/axios';

interface Address {
  address_id?: string;
  label: string;
  name: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  city: string;
  is_default: boolean;
  type: 'delivery' | 'pickup';
}

const AddressManagement = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [modalType, setModalType] = useState<'delivery' | 'pickup'>('delivery');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const user_id = user?.user_id;

  const fetchAddresses = async () => {
    const res = await axios.get('/user-addresses');
    setAddresses(res.data as Address[]);
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setModalType(address.type);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (address_id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) {
      await axios.delete(`/user-addresses/${address_id}`);
      fetchAddresses();
    }
  };

  const handleSetDefault = async (address_id: string) => {
    await axios.put(`/user-addresses/${address_id}/set-default`);
    fetchAddresses();
  };

  const handleSave = async (address: Address) => {
    try {
      const addressWithType = { ...address, type: modalType };
      if (editingAddress) {
        await axios.put(`/user-addresses/${editingAddress.address_id}`, {
          ...addressWithType,
          user_id
        });
      } else {
        await axios.post('/user-addresses', {
          ...addressWithType,
          user_id
        });
      }
      await fetchAddresses();
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setEditingAddress(null);
    } catch (error) {
      console.error('Error saving address:', error);
      alert('Có lỗi xảy ra khi lưu địa chỉ. Vui lòng thử lại.');
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setEditingAddress(null);
    }
  };

  // Phân loại địa chỉ
  const deliveryAddresses = addresses.filter(addr => addr.type === 'delivery');
  const pickupAddresses = addresses.filter(addr => addr.type === 'pickup');

  return <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Quản lý địa chỉ</h1>
        <div className="flex gap-2">
          <button onClick={() => { setIsAddModalOpen(true); setModalType('delivery'); }} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            Thêm địa chỉ giao hàng
          </button>
          <button onClick={() => { setIsAddModalOpen(true); setModalType('pickup'); }} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            Thêm địa chỉ lấy hàng
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Địa chỉ giao hàng</h2>
          {deliveryAddresses.map(address => <div key={address.address_id} className="bg-white rounded-lg p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-orange-500" />
                <span className="font-medium">{address.label}</span>
                {address.is_default && <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded text-xs">Mặc định</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEdit(address)} className="p-1 hover:bg-gray-100 rounded">
                  <PencilIcon className="h-4 w-4 text-gray-600" />
                </button>
                <button onClick={() => handleDelete(address.address_id || '')} className="p-1 hover:bg-gray-100 rounded">
                  <TrashIcon className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-gray-600">
              <div>{address.name}</div>
              <div>{address.phone}</div>
              <div>{address.street}, {address.ward}, {address.district}, {address.city}</div>
            </div>
            {!address.is_default && <button onClick={() => handleSetDefault(address.address_id || '')} className="text-orange-500 text-sm flex items-center gap-1 hover:text-orange-600">
                <StarIcon className={`h-4 w-4 ${address.is_default ? 'fill-orange-500' : 'fill-none'}`} />
                Đặt làm địa chỉ mặc định
              </button>}
          </div>)}
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">Địa chỉ lấy hàng</h2>
          {pickupAddresses.map(address => <div key={address.address_id} className="bg-white rounded-lg p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-blue-500" />
                <span className="font-medium">{address.label}</span>
                {address.is_default && <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs">Mặc định</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEdit(address)} className="p-1 hover:bg-gray-100 rounded">
                  <PencilIcon className="h-4 w-4 text-gray-600" />
                </button>
                <button onClick={() => handleDelete(address.address_id || '')} className="p-1 hover:bg-gray-100 rounded">
                  <TrashIcon className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-gray-600">
              <div>{address.name}</div>
              <div>{address.phone}</div>
              <div>{address.street}, {address.ward}, {address.district}, {address.city}</div>
            </div>
            {!address.is_default && <button onClick={() => handleSetDefault(address.address_id || '')} className="text-blue-500 text-sm flex items-center gap-1 hover:text-blue-600">
                <StarIcon className={`h-4 w-4 ${address.is_default ? 'fill-blue-500' : 'fill-none'}`} />
                Đặt làm địa chỉ mặc định
              </button>}
          </div>)}
        </div>
      </div>
      <AddAddressModal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setEditingAddress(null);
        }}
        onSave={(address) => { handleSave(address as Address); }}
        editingAddress={editingAddress}
        type={modalType}
        setType={setModalType}
      />
    </div>;
};
export default AddressManagement;