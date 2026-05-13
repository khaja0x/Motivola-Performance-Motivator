"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Camera, ArrowLeft, Pencil, CheckCircle2, Loader2, Plus, Eye, Trash2, Upload } from 'lucide-react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import PhotoCropper from '@/components/PhotoCropper';
import { useToast } from '@/components/ui/Toast';

export default function StaffFormPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const staffId = params.staffId as string;
  const { success: showSuccess, error: showError } = useToast();
  
  // Possible modes: 'add', 'edit', 'view'
  const isAddMode = staffId === 'add';
  const isEditMode = searchParams.get('mode') === 'edit';
  const isViewMode = !isAddMode && !isEditMode;

  const [formData, setFormData] = useState({
    staff_code: '',
    name: '',
    email: '',
    whatsapp_number: '',
    role: 'Staff',
    password: '',
    store_id: '',
    hire_date: new Date().toISOString().split('T')[0],
    status: 'active'
  });
  const [generationMode, setGenerationMode] = useState('Automatic');

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stores, setStores] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  useEffect(() => {
    const initPage = async () => {
      setIsLoading(true);
      try {
        const [meRes, storesRes] = await Promise.all([
          api.get('/api/auth/me'),
          api.get('/api/stores/')
        ]);

        const company = meRes.data.company;
        setStores(storesRes.data);
        
        if (isAddMode) {
          // Calculate the predicted next ID
          const genMode = company.staff_id_generation_mode || 'Automatic';
          setGenerationMode(genMode);

          // Calculate the predicted next ID
          const prefix = company.staff_id_prefix || "STF";
          const start_num = company.staff_id_start_number;
          const padding = company.staff_id_padding || 4;
          const suffix = company.staff_id_suffix || "";
          
          const generated_id = `${prefix}${start_num.toString().padStart(padding, '0')}${suffix}`;
          setFormData(prev => ({ ...prev, staff_code: generated_id }));
        } else {
          // Fetch existing staff data
          const [staffRes, companyRes] = await Promise.all([
            api.get(`/api/staff/${staffId}`),
            api.get('/api/auth/me')
          ]);
          const staff = staffRes.data;
          setGenerationMode(companyRes.data.company.staff_id_generation_mode || 'Automatic');
          setFormData({
            staff_code: staff.staff_code || '',
            name: staff.name || '',
            email: staff.email || '',
            whatsapp_number: staff.whatsapp_number || '',
            role: staff.role || 'Staff',
            password: '', // Don't show password hash
            store_id: staff.store_id || '',
            hire_date: staff.hire_date ? new Date(staff.hire_date).toISOString().split('T')[0] : '',
            status: staff.status || 'active'
          });
          if (staff.photo_url) {
            // Prepend base URL if it's a relative path (backend serves it)
            const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            setPreviewUrl(`${backendUrl}${staff.photo_url}`);
          }
        }
      } catch (err) {
        console.error("Failed to initialize staff page", err);
      } finally {
        setIsLoading(false);
      }
    };
    initPage();
  }, [staffId, isAddMode]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewMode) return;
    const file = e.target.files?.[0];
    if (file) {
      // Validate MIME type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        showError("Invalid file type. Please upload a JPEG, PNG, or WebP image.");
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // Increased for cropping
        showError("File size exceeds 5MB limit.");
        return;
      }
      const url = URL.createObjectURL(file);
      setImageToCrop(url);
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const croppedUrl = URL.createObjectURL(croppedBlob);
    setPreviewUrl(croppedUrl);
    
    // Create a new File object for upload
    const file = new File([croppedBlob], 'staff_photo.jpg', { type: 'image/jpeg' });
    setSelectedFile(file);
    setImageToCrop(null);
    setPhotoRemoved(false);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // Staff ID validation (for Manual mode)
    if (generationMode === 'Manual') {
      if (!formData.staff_code.trim()) {
        newErrors.staff_code = "Staff ID is required";
      } else if (formData.staff_code.length < 3) {
        newErrors.staff_code = "Staff ID must be at least 3 characters";
      } else if (formData.staff_code.length > 20) {
        newErrors.staff_code = "Staff ID is too long (max 20 characters)";
      } else if (!/^[A-Z0-9_-]+$/i.test(formData.staff_code)) {
        newErrors.staff_code = "Only letters, numbers, dashes, and underscores allowed";
      }
    }
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (/[<>{}[\]]/.test(formData.name)) {
      newErrors.name = "Name contains invalid characters";
    }

    // Email validation
    if (formData.email) {
      if (formData.email.length > 254) {
        newErrors.email = "Email is too long";
      } else if (!/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(formData.email)) {
        newErrors.email = "Invalid email format";
      }
    }

    // WhatsApp validation
    const cleanWhatsApp = formData.whatsapp_number.replace(/[^\d+]/g, '');
    if (!/^\+?[1-9]\d{6,14}$/.test(cleanWhatsApp)) {
      newErrors.whatsapp_number = "Enter valid WhatsApp number (e.g., +6599887766)";
    }

    // Password validation (only in Add mode or if user is trying to change it)
    if (isAddMode || formData.password) {
      if (isAddMode && !formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password && formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      } else if (formData.password && formData.password.length > 64) {
        newErrors.password = "Password is too long (max 64 characters)";
      } else if (formData.password && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        newErrors.password = "Include uppercase, lowercase, and a number";
      }
    }

    // Hire Date validation
    if (formData.hire_date) {
      const date = new Date(formData.hire_date);
      const minDate = new Date('2020-01-01');
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      
      if (date < minDate) {
        newErrors.hire_date = "Date cannot be before 2020";
      } else if (date > maxDate) {
        newErrors.hire_date = "Date cannot be more than 1 year in future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;
    if (!validate()) return;
        setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        whatsapp_number: formData.whatsapp_number.replace(/[^\d+]/g, ''),
        store_id: formData.store_id || null,
        photo_url: photoRemoved && !selectedFile ? null : undefined
      };

      if (!submitData.password) {
        delete (submitData as any).password;
      }

      let savedStaffId = staffId;
      if (isAddMode) {
        const res = await api.post('/api/staff/', submitData);
        savedStaffId = res.data.staff_id;
      } else {
        await api.put(`/api/staff/${staffId}`, submitData);
      }

      // 2. Upload photo if selected
      if (selectedFile) {
        const photoFormData = new FormData();
        photoFormData.append('file', selectedFile);
        await api.post(`/api/staff/${savedStaffId}/photo`, photoFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      showSuccess(`Staff member ${isAddMode ? 'added' : 'updated'} successfully!`);
      setTimeout(() => router.push(`/${tenantSlug}/staff`), 1500);
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.detail) {
        showError(err.response.data.detail);
      } else {
        showError(`Failed to ${isAddMode ? 'add' : 'update'} staff. Please try again.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin text-[#C69A70]" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center mb-8 gap-4 justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push(`/${tenantSlug}/staff`)}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {isAddMode ? 'Add Staff Member' : isEditMode ? 'Edit Staff Member' : 'View Staff Profile'}
            </h1>
            <p className="text-slate-500 mt-1">
              {isAddMode ? 'Create a new staff profile' : isEditMode ? 'Update staff information' : 'Detailed staff member profile'}
            </p>
          </div>
        </div>
        
        {isViewMode && (
          <button 
            onClick={() => router.push(`/${tenantSlug}/staff/${staffId}?mode=edit`)}
            className="px-6 py-2.5 bg-[#C69A70] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#b88c62] shadow-sm transition-all"
          >
            <Pencil size={18} />
            Edit Profile
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <form onSubmit={handleSubmit}>
          <div className="p-8 space-y-8">
            
            {/* Photo Upload/Avatar Area */}
            <div className="bg-[#FAF9F6] border border-slate-100 rounded-2xl p-6 flex items-center gap-10">
              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center relative overflow-hidden group">
                  <img 
                    src={previewUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${formData.name || 'new'}`} 
                    alt="Avatar Preview" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                
                {/* Overlapping Plus Button */}
                <button 
                  type="button"
                  onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                  className="absolute bottom-1 right-1 w-8 h-8 bg-[#0F764E] hover:bg-[#0c6140] text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg transition-transform active:scale-90 z-10"
                >
                  <Plus size={18} strokeWidth={3} />
                </button>

                {/* Photo Actions Dropdown */}
                {showPhotoMenu && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowPhotoMenu(false)} />
                    <div className="absolute top-full left-0 mt-3 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-30 animate-in fade-in zoom-in-95 duration-200">
                      <button 
                        type="button"
                        onClick={() => {
                          setShowPhotoModal(true);
                          setShowPhotoMenu(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-[13px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <Eye size={16} className="text-slate-400" />
                        View Image
                      </button>
                      
                      {!isViewMode && (
                        <>
                          <button 
                            type="button"
                            onClick={() => {
                              fileInputRef.current?.click();
                              setShowPhotoMenu(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-[13px] font-bold text-[#0F764E] hover:bg-slate-50 flex items-center gap-3 transition-colors border-t border-slate-50"
                          >
                            <Upload size={16} />
                            Upload Image
                          </button>
                          {previewUrl && (
                            <button 
                              type="button"
                              onClick={() => {
                                setPreviewUrl(null);
                                setSelectedFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                                setPhotoRemoved(true);
                                setShowPhotoMenu(false);
                              }}
                              className="w-full px-4 py-2.5 text-left text-[13px] font-bold text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors border-t border-slate-50"
                            >
                              <Trash2 size={16} />
                              Remove Image
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex flex-col">
                {!isViewMode && (
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg" 
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                  />
                )}
                <p className="text-[13px] font-bold text-slate-400">Click + for options • Max 2MB</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="space-y-1.5">
                <label className="text-slate-600 font-medium pb-2 flex items-center">
                  Staff ID <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${generationMode === 'Automatic' ? 'bg-[#C69A70]/10 text-[#C69A70]' : 'bg-blue-100 text-blue-600'}`}>
                    {generationMode === 'Automatic' ? 'Fixed' : 'Manual'}
                  </span>
                </label>
                <input 
                  type="text" 
                  value={formData.staff_code}
                  disabled={isViewMode || generationMode === 'Automatic'}
                  onChange={e => {
                    setFormData({...formData, staff_code: e.target.value.toUpperCase()});
                    if (errors.staff_code) setErrors({...errors, staff_code: ''});
                  }}
                  maxLength={20}
                  className={`w-full px-4 py-3 rounded-xl border font-bold shadow-sm transition-all ${errors.staff_code ? 'border-red-400 bg-red-50' : 'border-slate-200'} ${isViewMode || generationMode === 'Automatic' ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-dashed border-slate-200' : 'bg-white text-slate-900 border-slate-200 focus:ring-2 focus:ring-[#C69A70]'}`}
                />
                {!isViewMode && errors.staff_code && generationMode === 'Manual' && <p className="text-red-500 text-[10px] mt-1 font-bold absolute -bottom-5 left-1">{errors.staff_code}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-600 font-medium">Name</label>
                 <input 
                  type="text" 
                  required
                  readOnly={isViewMode}
                  value={formData.name}
                  onChange={e => {
                    setFormData({...formData, name: e.target.value});
                    if (errors.name) setErrors({...errors, name: ''});
                  }}
                  minLength={2}
                  maxLength={100}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-400 bg-red-50' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-[#C69A70] focus:border-transparent transition-all shadow-sm ${isViewMode ? 'bg-slate-50' : 'bg-white'}`}
                />
                {!isViewMode && errors.name && <p className="text-red-500 text-xs mt-1 absolute -bottom-5 left-0">{errors.name}</p>}
              </div>
              
              <div className="space-y-1.5 relative">
                <label className="text-slate-600 font-medium">Email</label>
                <input 
                  type="text" 
                  required
                  readOnly={isViewMode}
                  value={formData.email}
                   onChange={e => {
                    setFormData({...formData, email: e.target.value});
                    if (errors.email) setErrors({...errors, email: ''});
                  }}
                  maxLength={254}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-400 bg-red-50' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-[#C69A70] focus:border-transparent transition-all shadow-sm ${isViewMode ? 'bg-slate-50' : 'bg-white'}`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1 absolute -bottom-5 left-0">{errors.email}</p>}
              </div>
              
              {isAddMode && (
                <div className="space-y-1.5 relative">
                  <label className="text-slate-600 font-medium">Password</label>
                  <input 
                    type="password" 
                    required={isAddMode}
                    value={formData.password}
                     onChange={e => {
                      setFormData({...formData, password: e.target.value});
                      if (errors.password) setErrors({...errors, password: ''});
                    }}
                    minLength={8}
                    maxLength={64}
                    className={`w-full px-4 py-3 rounded-xl border ${errors.password ? 'border-red-400' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-[#C69A70] focus:border-transparent transition-all shadow-sm bg-white`}
                  />
                  {errors.password && <p className="text-red-500 text-xs mt-1 absolute -bottom-5 left-0">{errors.password}</p>}
                </div>
              )}

              <div className="space-y-1.5 relative mt-2">
                <label className="text-slate-600 font-medium">WhatsApp</label>
                <input 
                  type="text" 
                  placeholder="+65..."
                  required
                  readOnly={isViewMode}
                  value={formData.whatsapp_number}
                   onChange={e => {
                    setFormData({...formData, whatsapp_number: e.target.value});
                    if (errors.whatsapp_number) setErrors({...errors, whatsapp_number: ''});
                  }}
                  maxLength={20}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.whatsapp_number ? 'border-red-400' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-[#C69A70] focus:border-transparent transition-all shadow-sm ${isViewMode ? 'bg-slate-50' : 'bg-white'}`}
                />
                {errors.whatsapp_number && <p className="text-red-500 text-xs mt-1 absolute -bottom-5 left-0">{errors.whatsapp_number}</p>}
              </div>

              <div className="space-y-1.5 mt-2">
                <label className="text-slate-600 font-medium">Role</label>
                {isViewMode ? (
                  <div className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-600">
                    {formData.role}
                  </div>
                ) : (
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#C69A70] border-transparent transition-all bg-white shadow-sm"
                  >
                    <option value="Staff">Staff</option>
                    <option value="Supervisor">Supervisor</option>
                  </select>
                )}
              </div>

              <div className="space-y-1.5 mt-2">
                <label className="text-slate-600 font-medium">Store</label>
                {isViewMode ? (
                  <div className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-600">
                    {stores.find(s => s.store_id === formData.store_id)?.store_name || 'No Store / Main Office'}
                  </div>
                ) : (
                  <select 
                    value={formData.store_id}
                    onChange={e => setFormData({...formData, store_id: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#C69A70] border-transparent transition-all bg-white shadow-sm"
                  >
                    <option value="">No Store / Main Office</option>
                    {stores
                    .filter(store => 
                      formData.role === 'Staff' || 
                      !store.manager_name || 
                      (formData.store_id === store.store_id)
                    )
                    .map(store => (
                      <option key={store.store_id} value={store.store_id}>
                        {store.store_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5 mt-2">
                <label className="text-slate-600 font-medium">Joining Date</label>
                 <input 
                  type="date"
                  readOnly={isViewMode}
                  value={formData.hire_date}
                  onChange={e => {
                    setFormData({...formData, hire_date: e.target.value});
                    if (errors.hire_date) setErrors({...errors, hire_date: ''});
                  }}
                  className={`w-full px-4 py-3 rounded-xl border ${errors.hire_date ? 'border-red-400 bg-red-50' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-[#C69A70] border-transparent transition-all shadow-sm ${isViewMode ? 'bg-slate-50' : 'bg-white'} relative`}
                />
                {!isViewMode && errors.hire_date && <p className="text-red-500 text-xs mt-1 absolute -bottom-5 left-0">{errors.hire_date}</p>}
              </div>

              <div className="space-y-1.5 mt-2">
                <label className="text-slate-600 font-medium">Status</label>
                {isViewMode ? (
                  <div className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-black uppercase tracking-wider text-[11px] ${formData.status === 'active' ? 'text-green-500' : 'text-slate-400'}`}>
                    {formData.status}
                  </div>
                ) : (
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#C69A70] border-transparent transition-all bg-white shadow-sm font-bold"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="px-8 py-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
            <button 
              type="button" 
              onClick={() => router.push(`/${tenantSlug}/staff`)}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 transition-colors"
            >
              {isViewMode ? 'Back to List' : 'Cancel'}
            </button>
            {!isViewMode && (
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-8 py-2.5 rounded-xl font-semibold bg-[#C69A70] text-white hover:bg-[#b88c62] shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? 'Saving...' : (isAddMode ? 'Add Staff Member' : 'Save Changes')}
                {!isSubmitting && <CheckCircle2 size={18} />}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Profile Photo View Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPhotoModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 ml-2">Profile Photo</h3>
              <button 
                onClick={() => setShowPhotoModal(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors border border-slate-200"
              >
                Close
              </button>
            </div>
            <div className="p-4 bg-white flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-auto">
              <img 
                src={previewUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${formData.name || 'new'}`} 
                alt="Profile Large" 
                className="max-w-full h-auto rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      {imageToCrop && (
        <PhotoCropper 
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => setImageToCrop(null)}
        />
      )}
    </div>
  );
}
