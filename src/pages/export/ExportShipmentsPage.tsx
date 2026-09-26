import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Ship,
  Search,
  Plus,
  ArrowUpDown,
  Boxes,
  Clock,
  CheckCircle2,
  Calendar,
  Anchor,
  Navigation,
  FileText,
  X,
  RefreshCw,
  Eye,
  AlertCircle,
  Truck,
  Building2,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import { exportApi } from '../../api/exportApi';
import type {
  ExportShipment,
  ExportContainer,
  ExportShippingEvent,
  ExportOrder,
  ExportPort,
} from '../../types/admin';

export const ExportShipmentsPage: React.FC = () => {
  const [shipments, setShipments] = useState<ExportShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Shipment 360 / Drawer
  const [selectedShipment, setSelectedShipment] = useState<ExportShipment | null>(null);
  const [containers, setContainers] = useState<ExportContainer[]>([]);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'vessel' | 'containers' | 'events'>('vessel');

  // Modals
  const [showAddContainerModal, setShowAddContainerModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);

  // Add Container Form
  const [containerForm, setContainerForm] = useState({
    containerNumber: '',
    containerType: '40HC',
    sealNumber: '',
    tareWeightKg: 3800,
    payloadWeightKg: 22000,
    grossWeightKg: 25800,
    cbm: 68.5,
    stuffingDate: new Date().toISOString().split('T')[0],
  });
  const [savingContainer, setSavingContainer] = useState(false);

  // Add Event Form
  const [eventForm, setEventForm] = useState({
    eventType: 'DEPARTED_PORT',
    eventLocation: '',
    eventTimestamp: new Date().toISOString(),
    notes: '',
    source: 'CARRIER_EDI',
  });
  const [savingEvent, setSavingEvent] = useState(false);

  const loadShipments = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await exportApi.listShipments({
        page,
        limit: 15,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      if (res.data.success && res.data.data) {
        setShipments(res.data.data.items);
        setTotalPages(res.data.data.totalPages);
      }
    } catch (err) {
      console.error('Failed to load shipments', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, [page, search, statusFilter]);

  // Open Shipment Details
  const handleOpenShipment = async (shipment: ExportShipment) => {
    setSelectedShipment(shipment);
    setActiveDrawerTab('vessel');
    try {
      setLoadingContainers(true);
      const res = await exportApi.listContainers(shipment.id);
      if (res.data.success && res.data.data) {
        setContainers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load containers for shipment', err);
    } finally {
      setLoadingContainers(false);
    }
  };

  const handleAddContainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;
    try {
      setSavingContainer(true);
      const payload = {
        ...containerForm,
        shipmentId: selectedShipment.id,
      };
      const res = await exportApi.createContainer(payload);
      if (res.data.success && res.data.data) {
        const newContainer = res.data.data;
        setContainers((prev) => [...prev, newContainer]);
        setShowAddContainerModal(false);
        setContainerForm({
          containerNumber: '',
          containerType: '40HC',
          sealNumber: '',
          tareWeightKg: 3800,
          payloadWeightKg: 22000,
          grossWeightKg: 25800,
          cbm: 68.5,
          stuffingDate: new Date().toISOString().split('T')[0],
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record container');
    } finally {
      setSavingContainer(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;
    try {
      setSavingEvent(true);
      const res = await exportApi.addShippingEvent(selectedShipment.id, eventForm);
      if (res.data.success) {
        setShowAddEventModal(false);
        // Refresh shipment
        const refreshed = await exportApi.getShipmentById(selectedShipment.id);
        if (refreshed.data.success && refreshed.data.data) {
          setSelectedShipment(refreshed.data.data);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record tracking event');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedShipment) return;
    try {
      const res = await exportApi.updateShipment(selectedShipment.id, { status: newStatus });
      if (res.data.success && res.data.data) {
        setSelectedShipment(res.data.data);
        loadShipments();
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  // Status Styling Helper
  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (['DELIVERED', 'ARRIVED'].includes(s)) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (['IN_TRANSIT', 'ON_BOARD'].includes(s)) {
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    }
    if (['CONTAINER_STUFFED', 'CUSTOMS_CLEARED', 'PORT_GATE_IN'].includes(s)) {
      return 'bg-[#7FB706]/10 text-[#7FB706] border-[#7FB706]/20';
    }
    if (['CANCELLED'].includes(s)) {
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-12 text-gray-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-[#0f0e26] via-[#070714] to-[#0f0e26] p-4 sm:p-6 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#7FB706] to-[#B5F823] flex items-center justify-center text-[#030213] shadow-lg shadow-[#7FB706]/30">
            <Ship className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Export Logistics &amp; Shipments
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              Vessel Tracking, Ocean Containers (20GP/40HC), Sealing &amp; Bill of Lading Hub
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => loadShipments(true)}
            disabled={refreshing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition active:scale-95 min-h-[44px]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#7FB706]' : ''}`} />
            <span>Sync Live</span>
          </button>

          <Link
            to="/admin/dashboard/export/shipments/new"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7FB706] to-[#6fa005] hover:from-[#6fa005] hover:to-[#5d8704] text-[#030213] text-xs font-bold transition shadow-lg shadow-[#7FB706]/20 active:scale-95 min-h-[44px]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Plan Shipment</span>
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-[#0f0e26]/60 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by vessel, shipment #, BL / AWB, booking number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7FB706] transition min-h-[44px]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-gray-300 focus:outline-none focus:border-[#7FB706] min-h-[44px]"
        >
          <option value="">All Shipment Stages</option>
          <option value="PLANNED">Planned</option>
          <option value="BOOKED">Booked</option>
          <option value="CONTAINER_STUFFED">Container Stuffed</option>
          <option value="PORT_GATE_IN">Port Gate-In</option>
          <option value="CUSTOMS_CLEARED">Customs Cleared</option>
          <option value="ON_BOARD">On Board</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="ARRIVED">Arrived at Port</option>
          <option value="DELIVERED">Delivered</option>
        </select>
      </div>

      {/* Shipments List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#070714] border border-white/10 rounded-2xl">
          <RefreshCw className="w-8 h-8 text-[#7FB706] animate-spin mb-3" />
          <p className="text-xs text-gray-400 font-medium tracking-wide">Loading export shipments...</p>
        </div>
      ) : shipments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#070714] border border-white/10 rounded-2xl text-center">
          <Ship className="w-12 h-12 text-gray-600 mb-3 stroke-[1.5]" />
          <h3 className="text-base font-bold text-white mb-1">No Shipments Found</h3>
          <p className="text-xs text-gray-400 max-w-sm mb-4">
            Plan an ocean vessel or air shipment, stuff containers, and record Bill of Lading details.
          </p>
          <Link
            to="/admin/dashboard/export/shipments/new"
            className="flex items-center justify-center px-4 py-2 bg-[#7FB706] text-[#030213] rounded-xl text-xs font-bold hover:bg-[#B5F823] transition min-h-[44px]"
          >
            Create First Shipment
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto bg-[#070714] border border-white/10 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-gray-400 uppercase tracking-wider font-semibold border-b border-white/10">
                <tr>
                  <th className="px-4 py-3.5">Shipment &amp; Order</th>
                  <th className="px-4 py-3.5">Vessel / Carrier</th>
                  <th className="px-4 py-3.5">Route (POL → POD)</th>
                  <th className="px-4 py-3.5">BL / AWB</th>
                  <th className="px-4 py-3.5">ETD / ETA</th>
                  <th className="px-4 py-3.5">Containers</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white tracking-wide">{s.shipmentNumber}</div>
                      <div className="text-[11px] text-[#7FB706]">
                        {s.exportOrder?.exportOrderNumber || 'Unassigned'}
                      </div>
                      <div className="text-[10px] text-gray-500">{s.exportOrder?.party?.legalName}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-gray-200">
                        {s.vesselName || 'TBA'} {s.voyageNumber ? `(V.${s.voyageNumber})` : ''}
                      </div>
                      <div className="text-[10px] text-gray-400">Carrier: {s.shippingLine || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-gray-300 font-medium">
                        {s.portOfLoading?.name || 'Origin Port'}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        → {s.portOfDestination?.name || 'Dest. Port'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-gray-300">{s.blAwbNumber || 'Pending'}</div>
                      <div className="text-[10px] text-gray-500">{s.blType}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-gray-300">
                        ETD: {s.etd ? new Date(s.etd).toLocaleDateString() : 'N/A'}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        ETA: {s.eta ? new Date(s.eta).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10 font-bold text-gray-200">
                        <Boxes className="w-3.5 h-3.5 text-[#7FB706]" />
                        <span>{s.containers?.length || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          s.status
                        )}`}
                      >
                        {s.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenShipment(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#7FB706] hover:text-[#B5F823] font-semibold text-xs transition active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Transform */}
          <div className="md:hidden space-y-3">
            {shipments.map((s) => (
              <div
                key={s.id}
                onClick={() => handleOpenShipment(s)}
                className="bg-[#070714] border border-white/10 p-4 rounded-2xl space-y-3 cursor-pointer active:scale-[0.99] transition"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7FB706]">
                      {s.shipmentNumber}
                    </span>
                    <h4 className="text-sm font-black text-white">
                      {s.vesselName || 'Ocean Vessel (TBA)'} {s.voyageNumber ? `(V.${s.voyageNumber})` : ''}
                    </h4>
                    <p className="text-xs text-gray-400">Order: {s.exportOrder?.exportOrderNumber || 'N/A'}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(
                      s.status
                    )}`}
                  >
                    {s.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-white/5 text-gray-400">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Origin → Dest</span>
                    <span className="font-semibold text-gray-300 truncate block">
                      {s.portOfLoading?.portCode || 'IN'} → {s.portOfDestination?.portCode || 'AE'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Containers Stuffed</span>
                    <span className="font-semibold text-gray-300 block">
                      {s.containers?.length || 0} units
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">ETD Departure</span>
                    <span className="font-semibold text-gray-300 block">
                      {s.etd ? new Date(s.etd).toLocaleDateString() : 'Pending'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Bill of Lading</span>
                    <span className="font-mono text-gray-300 block truncate">
                      {s.blAwbNumber || 'Not Issued'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-4 py-3 bg-[#070714] border border-white/10 rounded-xl text-xs">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
              >
                Previous
              </button>
              <span className="text-gray-400">
                Page <span className="text-white font-bold">{page}</span> of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Shipment 360 Detail Drawer / Modal */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#070714] border border-white/15 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
            {/* Drawer Header */}
            <div className="p-4 sm:p-6 bg-[#0f0e26] border-b border-white/10 flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black tracking-wider text-[#7FB706] uppercase">
                    {selectedShipment.shipmentNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                      selectedShipment.status
                    )}`}
                  >
                    {selectedShipment.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {selectedShipment.vesselName || 'Ocean Vessel TBA'}{' '}
                  {selectedShipment.voyageNumber ? `(Voyage ${selectedShipment.voyageNumber})` : ''}
                </h3>
                <p className="text-xs text-gray-400">
                  Carrier: {selectedShipment.shippingLine || 'Standard Ocean Line'} • Booking #{' '}
                  {selectedShipment.bookingNumber || 'N/A'}
                </p>
              </div>

              <button
                onClick={() => setSelectedShipment(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Status Bar Changer */}
            <div className="px-4 sm:px-6 py-2.5 bg-black/40 border-b border-white/5 flex items-center justify-between overflow-x-auto text-xs gap-3">
              <span className="text-gray-400 text-[11px] font-semibold uppercase tracking-wider shrink-0">
                Move Stage:
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {['BOOKED', 'CONTAINER_STUFFED', 'PORT_GATE_IN', 'ON_BOARD', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED'].map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(st)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                        selectedShipment.status === st
                          ? 'bg-[#7FB706] text-[#030213]'
                          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {st.replace(/_/g, ' ')}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Drawer Tabs */}
            <div className="flex border-b border-white/10 px-4 sm:px-6 bg-[#0f0e26]/50">
              <button
                onClick={() => setActiveDrawerTab('vessel')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                  activeDrawerTab === 'vessel'
                    ? 'border-[#7FB706] text-[#7FB706]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Vessel &amp; Ports
              </button>
              <button
                onClick={() => setActiveDrawerTab('containers')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                  activeDrawerTab === 'containers'
                    ? 'border-[#7FB706] text-[#7FB706]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Containers ({containers.length})
              </button>
              <button
                onClick={() => setActiveDrawerTab('events')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition ${
                  activeDrawerTab === 'events'
                    ? 'border-[#7FB706] text-[#7FB706]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Milestone Tracking ({selectedShipment.shippingEvents?.length || 0})
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {activeDrawerTab === 'vessel' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-black/40 border border-white/10 p-4 rounded-2xl space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Port of Loading (POL)
                      </span>
                      <p className="text-sm font-bold text-white">
                        {selectedShipment.portOfLoading?.name || 'Port Not Selected'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Code: {selectedShipment.portOfLoading?.portCode || 'IN'} • Type:{' '}
                        {selectedShipment.portOfLoading?.portType || 'SEA'}
                      </p>
                    </div>

                    <div className="bg-black/40 border border-white/10 p-4 rounded-2xl space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Port of Destination (POD)
                      </span>
                      <p className="text-sm font-bold text-white">
                        {selectedShipment.portOfDestination?.name || 'Port Not Selected'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Code: {selectedShipment.portOfDestination?.portCode || 'AE'} • Country:{' '}
                        {selectedShipment.portOfDestination?.country?.name || 'UAE'}
                      </p>
                    </div>

                    <div className="bg-black/40 border border-white/10 p-4 rounded-2xl space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Bill of Lading Details
                      </span>
                      <p className="text-sm font-mono font-bold text-white">
                        {selectedShipment.blAwbNumber || 'Not Issued'}
                      </p>
                      <p className="text-xs text-gray-400">
                        Type: {selectedShipment.blType} • Freight: {selectedShipment.freightTerm}
                      </p>
                    </div>

                    <div className="bg-black/40 border border-white/10 p-4 rounded-2xl space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Estimated Voyage Schedule
                      </span>
                      <div className="flex justify-between text-xs pt-1">
                        <div>
                          <span className="text-gray-500 block">ETD Departure</span>
                          <span className="text-white font-bold">
                            {selectedShipment.etd ? new Date(selectedShipment.etd).toLocaleDateString() : 'Pending'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">ETA Arrival</span>
                          <span className="text-white font-bold">
                            {selectedShipment.eta ? new Date(selectedShipment.eta).toLocaleDateString() : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedShipment.notes && (
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Logistics Notes
                      </span>
                      <p className="text-xs text-gray-300 leading-relaxed">{selectedShipment.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {activeDrawerTab === 'containers' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">
                      Loaded Shipping Containers
                    </h4>
                    <button
                      onClick={() => setShowAddContainerModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7FB706] text-[#030213] text-xs font-bold hover:bg-[#B5F823] transition min-h-[44px]"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Stuff Container</span>
                    </button>
                  </div>

                  {loadingContainers ? (
                    <div className="p-8 text-center text-xs text-gray-400">Loading containers...</div>
                  ) : containers.length === 0 ? (
                    <div className="p-8 bg-black/30 border border-white/10 rounded-2xl text-center">
                      <Boxes className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">No containers stuffed for this shipment yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {containers.map((c) => (
                        <div
                          key={c.id}
                          className="bg-black/40 border border-white/10 p-4 rounded-2xl space-y-2 relative"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-bold text-[#7FB706] uppercase">
                                {c.containerType}
                              </span>
                              <h5 className="font-mono font-bold text-sm text-white">{c.containerNumber}</h5>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-gray-300">
                              {c.status}
                            </span>
                          </div>

                          <div className="text-xs space-y-1 text-gray-400 pt-1 border-t border-white/5">
                            <div className="flex justify-between">
                              <span>Customs Seal #:</span>
                              <span className="font-mono text-gray-200">{c.sealNumber || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Payload Weight:</span>
                              <span className="text-gray-200">{c.payloadWeightKg} KG</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Gross Weight:</span>
                              <span className="text-gray-200 font-semibold">{c.grossWeightKg} KG</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Volume (CBM):</span>
                              <span className="text-[#7FB706] font-bold">{c.cbm} CBM</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeDrawerTab === 'events' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">
                      Tracking Timeline &amp; Events
                    </h4>
                    <button
                      onClick={() => setShowAddEventModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition min-h-[44px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log Event</span>
                    </button>
                  </div>

                  {(!selectedShipment.shippingEvents || selectedShipment.shippingEvents.length === 0) ? (
                    <div className="p-8 bg-black/30 border border-white/10 rounded-2xl text-center">
                      <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">No milestone events logged yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-white/10">
                      {selectedShipment.shippingEvents.map((evt) => (
                        <div key={evt.id} className="flex gap-4 relative items-start">
                          <div className="w-7 h-7 rounded-full bg-[#7FB706] text-[#030213] flex items-center justify-center font-bold text-xs shrink-0 shadow-lg shadow-[#7FB706]/30 mt-0.5 z-10">
                            <Navigation className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 bg-black/40 border border-white/10 p-3 rounded-xl text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-white uppercase tracking-wider">
                                {evt.eventType.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {new Date(evt.eventTimestamp).toLocaleString()}
                              </span>
                            </div>
                            {evt.eventLocation && (
                              <p className="text-gray-300 font-medium">Location: {evt.eventLocation}</p>
                            )}
                            {evt.notes && <p className="text-gray-400 text-[11px]">{evt.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* Add Container Modal */}
      {showAddContainerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#070714] border border-white/15 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
            <div className="p-4 sm:p-6 bg-[#0f0e26] border-b border-white/10 flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-black text-white">Stuff Container</h3>
              <button
                onClick={() => setShowAddContainerModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddContainer} className="p-4 sm:p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 font-bold block mb-1">Container Number *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. MSKU9481920"
                    value={containerForm.containerNumber}
                    onChange={(e) => setContainerForm({ ...containerForm, containerNumber: e.target.value.toUpperCase() })}
                    className="w-full font-mono bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-gray-400 font-bold block mb-1">Container Type</label>
                  <select
                    value={containerForm.containerType}
                    onChange={(e) => setContainerForm({ ...containerForm, containerType: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                  >
                    <option value="20GP">20' General Purpose (20GP)</option>
                    <option value="40GP">40' General Purpose (40GP)</option>
                    <option value="40HC">40' High Cube (40HC)</option>
                    <option value="45HC">45' High Cube (45HC)</option>
                    <option value="LCL">Less Than Container Load (LCL)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 font-bold block mb-1">Customs Bolt Seal #</label>
                  <input
                    type="text"
                    placeholder="e.g. IN9842918"
                    value={containerForm.sealNumber}
                    onChange={(e) => setContainerForm({ ...containerForm, sealNumber: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-gray-400 font-bold block mb-1">CBM Volume</label>
                  <input
                    type="number"
                    step="0.1"
                    value={containerForm.cbm}
                    onChange={(e) => setContainerForm({ ...containerForm, cbm: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-gray-400 font-bold block mb-1">Tare (KG)</label>
                  <input
                    type="number"
                    value={containerForm.tareWeightKg}
                    onChange={(e) => setContainerForm({ ...containerForm, tareWeightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-2 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 font-bold block mb-1">Payload (KG)</label>
                  <input
                    type="number"
                    value={containerForm.payloadWeightKg}
                    onChange={(e) => {
                      const pl = parseFloat(e.target.value) || 0;
                      setContainerForm({
                        ...containerForm,
                        payloadWeightKg: pl,
                        grossWeightKg: pl + containerForm.tareWeightKg,
                      });
                    }}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-2 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 font-bold block mb-1">Gross (KG)</label>
                  <input
                    type="number"
                    value={containerForm.grossWeightKg}
                    onChange={(e) => setContainerForm({ ...containerForm, grossWeightKg: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-2 py-2 text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddContainerModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-300 font-semibold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingContainer}
                  className="px-5 py-2.5 rounded-xl bg-[#7FB706] hover:bg-[#B5F823] text-[#030213] font-bold min-h-[44px] disabled:opacity-50"
                >
                  {savingContainer ? 'Saving...' : 'Confirm Container'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#070714] border border-white/15 rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
            <div className="p-4 sm:p-6 bg-[#0f0e26] border-b border-white/10 flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-black text-white">Log Tracking Milestone</h3>
              <button
                onClick={() => setShowAddEventModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="p-4 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="text-gray-400 font-bold block mb-1">Event Type *</label>
                <select
                  value={eventForm.eventType}
                  onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                >
                  <option value="STUFFED_AT_FACTORY">Stuffed at Factory</option>
                  <option value="GATE_IN_PORT">Gate In at Port of Loading</option>
                  <option value="CUSTOMS_EXAM_CLEARED">Customs Examination Cleared</option>
                  <option value="LOADED_ON_VESSEL">Loaded on Vessel</option>
                  <option value="DEPARTED_PORT">Vessel Departed Port</option>
                  <option value="TRANSSHIPMENT_ARRIVAL">Arrived at Transshipment Hub</option>
                  <option value="DESTINATION_ARRIVED">Arrived at Destination Port</option>
                  <option value="CUSTOMS_CLEARED_IMPORT">Import Customs Cleared</option>
                  <option value="DELIVERED_TO_BUYER">Delivered to Buyer Warehouse</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 font-bold block mb-1">Location / Port</label>
                <input
                  type="text"
                  placeholder="e.g. Nhava Sheva Port, India or Jebel Ali, UAE"
                  value={eventForm.eventLocation}
                  onChange={(e) => setEventForm({ ...eventForm, eventLocation: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-white min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-gray-400 font-bold block mb-1">Notes / Inspection Comments</label>
                <textarea
                  rows={3}
                  placeholder="Vessel on schedule, seal intact..."
                  value={eventForm.notes}
                  onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-300 font-semibold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="px-5 py-2.5 rounded-xl bg-[#7FB706] hover:bg-[#B5F823] text-[#030213] font-bold min-h-[44px] disabled:opacity-50"
                >
                  {savingEvent ? 'Saving...' : 'Record Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportShipmentsPage;
