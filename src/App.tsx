import React, { useState, useMemo } from 'react';
import { 
  Settings, 
  Users, 
  RotateCcw, 
  Plus, 
  X, 
  Cake, 
  Truck, 
  ShoppingCart, 
  UtensilsCrossed, 
  DollarSign, 
  Wallet, 
  Coins, 
  Scale 
} from 'lucide-react';

type Person = {
  id: string;
  name: string;
  hasPaid: boolean;
  amountGiven: number;
  donateChange: boolean;
};

type Item = {
  id: string;
  personId: string;
  name: string;
  quantity: number;
  price: number;
};

type SharedCost = {
  id: string;
  desc: string;
  amount: number;
};

const generateId = () => Math.random().toString(36).substring(2, 9);

export default function App() {
  // --- State ---
  const [people, setPeople] = useState<Person[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [sharedCosts, setSharedCosts] = useState<SharedCost[]>([]);
  
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState<number>(0);
  
  const [hasBirthday, setHasBirthday] = useState(false);
  const [birthdayPersonId, setBirthdayPersonId] = useState<string | null>(null);

  // Form states
  const [newPersonName, setNewPersonName] = useState('');
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemPrice, setNewItemPrice] = useState<number | ''>('');
  const [newItemPersonId, setNewItemPersonId] = useState<string>('');

  const [newSharedDesc, setNewSharedDesc] = useState('');
  const [newSharedAmount, setNewSharedAmount] = useState<number | ''>('');

  // --- Handlers ---
  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    setPeople([...people, { 
      id: generateId(), 
      name: newPersonName.trim(), 
      hasPaid: false, 
      amountGiven: 0, 
      donateChange: false 
    }]);
    setNewPersonName('');
  };

  const handleRemovePerson = (id: string) => {
    setPeople(people.filter(p => p.id !== id));
    setItems(items.filter(i => i.personId !== id));
    if (birthdayPersonId === id) setBirthdayPersonId(null);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPersonId || newItemPrice === '' || newItemPrice < 0 || newItemQty < 1) return;
    setItems([...items, {
      id: generateId(),
      personId: newItemPersonId,
      name: newItemName.trim(),
      quantity: newItemQty,
      price: Number(newItemPrice)
    }]);
    setNewItemName('');
    setNewItemQty(1);
    setNewItemPrice('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleAddSharedCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSharedDesc.trim() || newSharedAmount === '') return;
    setSharedCosts([...sharedCosts, {
      id: generateId(),
      desc: newSharedDesc.trim(),
      amount: Number(newSharedAmount)
    }]);
    setNewSharedDesc('');
    setNewSharedAmount('');
  };

  const handleRemoveSharedCost = (id: string) => {
    setSharedCosts(sharedCosts.filter(c => c.id !== id));
  };

  const handleUpdatePayment = (personId: string, amountGiven: number, hasPaid: boolean) => {
    setPeople(people.map(p => p.id === personId ? { ...p, amountGiven, hasPaid } : p));
  };

  const handleToggleDonate = (personId: string, donateChange: boolean) => {
    setPeople(people.map(p => p.id === personId ? { ...p, donateChange } : p));
  };

  const handleClearAll = () => {
    if (confirm('¿Estás seguro de limpiar todo?')) {
      setPeople([]);
      setItems([]);
      setSharedCosts([]);
      setHasDelivery(false);
      setDeliveryCost(0);
      setHasBirthday(false);
      setBirthdayPersonId(null);
    }
  };

  // --- Calculations ---
  const { 
    finalDivision, 
    grandTotal, 
    totalDeliveryGuy, 
    totalStore, 
    totalReceived, 
    totalChangeToGive, 
    balance 
  } = useMemo(() => {
    const subtotalItems = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const storeCosts = sharedCosts.reduce((sum, cost) => sum + cost.amount, 0);
    const delivery = hasDelivery ? deliveryCost : 0;
    
    const totalDeliveryGuy = subtotalItems + delivery;
    const totalStore = storeCosts;
    const grandTotal = totalDeliveryGuy + totalStore;

    const baseCosts: Record<string, number> = {};
    people.forEach(p => baseCosts[p.id] = 0);
    
    items.forEach(item => {
      if (baseCosts[item.personId] !== undefined) {
        baseCosts[item.personId] += item.price * item.quantity;
      }
    });

    const numPeople = people.length;
    const sharedPerPerson = numPeople > 0 ? (storeCosts + delivery) / numPeople : 0;
    Object.keys(baseCosts).forEach(id => {
      baseCosts[id] += sharedPerPerson;
    });

    if (hasBirthday && birthdayPersonId && baseCosts[birthdayPersonId] !== undefined) {
      const bdAmount = baseCosts[birthdayPersonId];
      baseCosts[birthdayPersonId] = 0;
      
      const others = people.filter(p => p.id !== birthdayPersonId);
      if (others.length > 0) {
        const extraShare = bdAmount / others.length;
        others.forEach(p => {
          baseCosts[p.id] += extraShare;
        });
      }
    }

    let totalDonated = 0;
    const receivers: string[] = [];
    
    people.forEach(p => {
      if (p.donateChange && p.amountGiven > baseCosts[p.id]) {
        totalDonated += p.amountGiven - baseCosts[p.id];
      } else if (p.id !== birthdayPersonId) {
        receivers.push(p.id);
      }
    });

    const discountPerPerson = receivers.length > 0 ? totalDonated / receivers.length : 0;

    const finalCosts: Record<string, number> = {};
    people.forEach(p => {
      if (p.donateChange && p.amountGiven > baseCosts[p.id]) {
        finalCosts[p.id] = baseCosts[p.id]; 
      } else {
        finalCosts[p.id] = Math.max(0, baseCosts[p.id] - discountPerPerson);
      }
    });

    const division = people.map(p => {
      const amountToPay = finalCosts[p.id] || 0;
      let change = p.amountGiven > amountToPay ? p.amountGiven - amountToPay : 0;
      let donatedAmount = 0;

      if (p.donateChange && p.amountGiven > baseCosts[p.id]) {
        donatedAmount = p.amountGiven - baseCosts[p.id];
        change = 0; 
      }

      return {
        ...p,
        baseCost: baseCosts[p.id],
        amountToPay,
        change,
        donatedAmount,
        isBirthday: hasBirthday && p.id === birthdayPersonId
      };
    }).sort((a, b) => b.amountToPay - a.amountToPay);

    const totalReceived = people.reduce((sum, p) => sum + (p.amountGiven || 0), 0);
    const totalChangeToGive = division.reduce((sum, p) => sum + p.change, 0);
    const balance = (totalReceived - totalChangeToGive) - grandTotal;

    return {
      finalDivision: division,
      grandTotal,
      totalDeliveryGuy,
      totalStore,
      totalReceived,
      totalChangeToGive,
      balance
    };
  }, [people, items, sharedCosts, hasDelivery, deliveryCost, hasBirthday, birthdayPersonId]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen w-full bg-[#f4f5f7] text-[#202020] font-sans antialiased selection:bg-[#7040e0] selection:text-white overflow-x-hidden lg:overflow-hidden">
      {/* Sidebar Configuration */}
      <aside className="w-full lg:w-[420px] flex-shrink-0 bg-[#ffffff] lg:border-r border-[#e5e7eb] flex flex-col lg:h-full z-10 shadow-xl lg:shadow-[2px_0_24px_rgba(0,0,0,0.04)] lg:overflow-y-auto">
        <div className="p-6 border-b border-[#e5e7eb] flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#7040e0] flex items-center justify-center text-white">
              <Settings size={16} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#202020]">Configuración</h1>
          </div>
          <button onClick={handleClearAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-[#202020] bg-[#f4f5f7] hover:bg-[#e5e7eb] transition-colors uppercase tracking-widest">
            <RotateCcw size={12} strokeWidth={3} />
            Reiniciar
          </button>
        </div>
        
        <div className="flex-1 p-6 space-y-6">
          
          {/* People */}
          <section className="bg-white rounded-3xl p-5 border border-[#e5e7eb] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#202020] flex items-center justify-center text-white">
                <Users size={12} />
              </div>
              <h2 className="text-xs font-bold text-[#202020] uppercase tracking-widest">1. Personas</h2>
            </div>
            <form onSubmit={handleAddPerson} className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="Nombre de la persona" 
                className="flex-1 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7040e0]/20 focus:border-[#7040e0] transition-all placeholder:text-[#9ca3af]"
                value={newPersonName}
                onChange={e => setNewPersonName(e.target.value)}
              />
              <button type="submit" className="flex items-center justify-center bg-[#202020] hover:bg-[#111827] text-white w-11 h-11 rounded-xl transition-transform active:scale-95">
                <Plus size={20} />
              </button>
            </form>
            {people.length > 0 && (
              <ul className="rounded-2xl border border-[#e5e7eb] divide-y divide-[#e5e7eb] bg-[#f9fafb] max-h-48 overflow-y-auto">
                {people.map(p => (
                  <li key={p.id} className="flex justify-between items-center px-4 py-3 text-sm group">
                    <span className="font-semibold text-[#374151]">{p.name}</span>
                    <button onClick={() => handleRemovePerson(p.id)} className="w-6 h-6 flex items-center justify-center rounded-full bg-white border border-[#e5e7eb] text-[#9ca3af] hover:text-[#ef4444] hover:border-[#ef4444] hover:bg-[#fef2f2] transition-colors shadow-sm" title="Eliminar">
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Specials (Color Block: Purple) */}
          <section className="bg-[#f5f3ff] rounded-3xl p-5 border border-[#ede9fe] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#7040e0] flex items-center justify-center text-white">
                <Cake size={12} />
              </div>
              <h2 className="text-xs font-bold text-[#4c1d95] uppercase tracking-widest">2. Especiales</h2>
            </div>
            
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-white border border-[#ede9fe] shadow-sm">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={hasBirthday} onChange={e => setHasBirthday(e.target.checked)} className="rounded-md border-[#c4b5fd] text-[#7040e0] focus:ring-[#7040e0] w-4 h-4" />
                  <span className="text-sm font-semibold text-[#4c1d95]">Cumpleañero (Gratis)</span>
                </label>
                {hasBirthday && (
                  <select 
                    className="mt-3 w-full border border-[#ede9fe] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7040e0]/20 bg-[#f8fafc]"
                    value={birthdayPersonId || ''}
                    onChange={e => setBirthdayPersonId(e.target.value)}
                  >
                    <option value="" disabled>Seleccionar persona...</option>
                    {people.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#ede9fe] shadow-sm">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={hasDelivery} onChange={e => setHasDelivery(e.target.checked)} className="rounded-md border-[#c4b5fd] text-[#7040e0] focus:ring-[#7040e0] w-4 h-4" />
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#4c1d95]">
                    <Truck size={16} />
                    Costo de envío
                  </span>
                </label>
                {hasDelivery && (
                  <div className="mt-3 flex items-center gap-2 relative">
                    <span className="absolute left-3 text-[#a78bfa] text-sm font-bold">$</span>
                    <input 
                      type="number" 
                      min="0" step="0.01"
                      className="w-full pl-7 pr-3 py-2.5 border border-[#ede9fe] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7040e0]/20 bg-[#f8fafc]"
                      value={deliveryCost === 0 ? '' : deliveryCost}
                      onChange={e => setDeliveryCost(Number(e.target.value))}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Shared / Credits (Color Block: Amber) */}
          <section className="bg-[#fffbeb] rounded-3xl p-5 border border-[#fef3c7] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#d97706] flex items-center justify-center text-white">
                <ShoppingCart size={12} />
              </div>
              <h2 className="text-xs font-bold text-[#92400e] uppercase tracking-widest">3. Tienda / Bonos</h2>
            </div>
            <p className="text-xs text-[#b45309] mb-4 leading-relaxed font-medium">
              Sodas o descuentos del jefe (usa negativos).
            </p>
            <form onSubmit={handleAddSharedCost} className="space-y-3">
              <input 
                type="text" 
                placeholder="Ej. Sodas, Bono" 
                className="w-full bg-white border border-[#fde68a] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706]/20 placeholder:text-[#d97706]/40"
                value={newSharedDesc}
                onChange={e => setNewSharedDesc(e.target.value)}
              />
              <div className="flex gap-2">
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Monto" 
                  className="flex-1 bg-white border border-[#fde68a] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d97706]/20 placeholder:text-[#d97706]/40"
                  value={newSharedAmount}
                  onChange={e => setNewSharedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                />
                <button type="submit" className="flex items-center gap-1 bg-[#d97706] hover:bg-[#b45309] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-transform active:scale-95">
                  <Plus size={16} />
                  Añadir
                </button>
              </div>
            </form>
            {sharedCosts.length > 0 && (
              <ul className="mt-4 border border-[#fde68a] rounded-2xl divide-y divide-[#fde68a] bg-white max-h-32 overflow-y-auto">
                {sharedCosts.map(c => (
                  <li key={c.id} className="flex justify-between items-center px-4 py-3 text-sm">
                    <span className="font-semibold text-[#92400e]">{c.desc}</span>
                    <div className="flex items-center gap-3">
                      <span className={`font-black ${c.amount < 0 ? 'text-[#059669]' : 'text-[#b45309]'}`}>
                        ${c.amount.toFixed(2)}
                      </span>
                      <button onClick={() => handleRemoveSharedCost(c.id)} className="w-6 h-6 flex items-center justify-center rounded-full bg-[#fffbeb] text-[#d97706] hover:bg-[#fef3c7] hover:text-[#92400e] transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Add Dish (Color Block: Emerald) */}
          <section className="bg-[#f0fdf4] rounded-3xl p-5 border border-[#dcfce7] shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#059669] flex items-center justify-center text-white">
                <UtensilsCrossed size={12} />
              </div>
              <h2 className="text-xs font-bold text-[#065f46] uppercase tracking-widest">4. Platos</h2>
            </div>
            <form onSubmit={handleAddItem} className="space-y-3">
              <select 
                className="w-full border border-[#bbf7d0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/20 bg-white text-[#064e3b]"
                value={newItemPersonId}
                onChange={e => setNewItemPersonId(e.target.value)}
              >
                <option value="" disabled>¿Quién pidió?</option>
                {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              
              <input 
                type="text" 
                placeholder="Nombre del plato" 
                className="w-full border border-[#bbf7d0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/20 bg-white placeholder:text-[#059669]/40 text-[#064e3b]"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
              />
              
              <div className="flex gap-2">
                <div className="w-24">
                  <input 
                    type="number" min="1" placeholder="Cant." 
                    className="w-full border border-[#bbf7d0] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/20 bg-white text-center text-[#064e3b]"
                    value={newItemQty}
                    onChange={e => setNewItemQty(Number(e.target.value))}
                  />
                </div>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#34d399] text-sm font-bold">$</span>
                  <input 
                    type="number" min="0" step="0.01" placeholder="Precio unitario" 
                    className="w-full border border-[#bbf7d0] rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#059669]/20 bg-white placeholder:text-[#059669]/40 text-[#064e3b]"
                    value={newItemPrice}
                    onChange={e => setNewItemPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
              </div>
              
              <button type="submit" className="w-full flex items-center justify-center gap-2 bg-[#059669] hover:bg-[#047857] text-white py-3 rounded-xl text-sm font-bold transition-transform active:scale-[0.98] mt-2 shadow-sm">
                <Plus size={18} />
                Agregar Plato
              </button>
            </form>
          </section>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full lg:h-full lg:overflow-y-auto bg-[#f4f5f7]">
        <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 max-w-5xl mx-auto w-full">
          
          {/* Color Blocked Summary Section (Dark Theme Header) */}
          <section className="bg-[#202020] text-white rounded-[2rem] p-6 lg:p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Wallet size={20} className="text-white" />
              </div>
              <h2 className="text-base font-bold uppercase tracking-widest text-white">Resumen de Caja</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1 */}
              <div className="bg-[#333333] p-5 rounded-3xl flex flex-col justify-between shadow-inner">
                <div>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest mb-2">
                    <DollarSign size={14} /> Total Pedido
                  </span>
                  <span className="text-3xl font-black">${grandTotal.toFixed(2)}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 text-[11px] font-semibold text-[#d4d4d4] flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><Truck size={12}/> Repartidor</span> 
                    <span>${totalDeliveryGuy.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><ShoppingCart size={12}/> Tienda</span> 
                    <span>${totalStore.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-[#333333] p-5 rounded-3xl flex flex-col justify-between shadow-inner">
                <div>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest mb-2">
                    <Coins size={14} /> Dinero Recibido
                  </span>
                  <span className="text-3xl font-black">${totalReceived.toFixed(2)}</span>
                </div>
                <p className="mt-4 pt-4 border-t border-white/10 text-[11px] font-medium leading-tight text-[#a3a3a3]">
                  Suma exacta de todo el dinero ingresado.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-[#333333] p-5 rounded-3xl flex flex-col justify-between shadow-inner">
                <div>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#a3a3a3] uppercase tracking-widest mb-2">
                    <RotateCcw size={14} /> Vuelto Total
                  </span>
                  <span className="text-3xl font-black">${totalChangeToGive.toFixed(2)}</span>
                </div>
                <p className="mt-4 pt-4 border-t border-white/10 text-[11px] font-medium leading-tight text-[#a3a3a3]">
                  Suma total del dinero a devolver.
                </p>
              </div>

              {/* Card 4 - Dynamic Balance Color */}
              <div className={`p-5 rounded-3xl flex flex-col justify-between shadow-lg transition-colors ${
                balance === 0 ? 'bg-[#404040]' : 
                balance > 0 ? 'bg-[#00d000]' : 'bg-[#d00000]'
              }`}>
                <div>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-2 text-white/80">
                    <Scale size={14} /> Balance
                  </span>
                  <span className="text-3xl font-black text-white">
                    {balance > 0 ? '+' : ''}{balance.toFixed(2)}
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20 text-[11px] font-bold leading-tight text-white">
                  {balance === 0 ? 'CAJA BALANCEADA' : balance > 0 ? 'SOBRA DINERO' : 'FALTA DINERO'}
                </div>
              </div>
            </div>
          </section>
          
          {/* Division Results Container */}
          <section className="bg-white rounded-[2rem] shadow-sm border border-[#e5e7eb] p-4 lg:p-6 mb-8">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-10 h-10 rounded-full bg-[#f4f5f7] flex items-center justify-center">
                <Users size={20} className="text-[#202020]" />
              </div>
              <h2 className="text-base font-bold uppercase tracking-widest text-[#202020]">División por Persona</h2>
            </div>

            {finalDivision.length > 0 ? (
              <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-[#f8fafc] text-[10px] font-bold text-[#64748b] uppercase tracking-widest">
                      <th className="px-6 py-4 rounded-l-2xl">Persona</th>
                      <th className="px-6 py-4 text-right">Costo Real</th>
                      <th className="px-6 py-4">Pago / Aporte</th>
                      <th className="px-6 py-4 text-right">Vuelto</th>
                      <th className="px-6 py-4 text-center w-36 rounded-r-2xl">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {finalDivision.map((p, idx) => (
                      <tr key={p.id} className={`group hover:bg-[#f8fafc] transition-colors ${p.isBirthday ? 'bg-[#fffbeb]' : ''} ${p.hasPaid ? 'opacity-60 grayscale-[30%]' : ''}`}>
                        <td className={`px-6 py-5 align-top ${idx === finalDivision.length - 1 ? 'rounded-bl-2xl' : ''}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#1f2937] text-base">{p.name}</span>
                            {p.isBirthday && <div className="bg-[#fef3c7] text-[#d97706] p-1.5 rounded-full"><Cake size={12} /></div>}
                          </div>
                          <div className="text-xs text-[#64748b] mt-1.5 max-w-[200px] leading-relaxed font-medium">
                            {items.filter(i => i.personId === p.id).map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Sin platos'}
                          </div>
                        </td>
                        
                        <td className="px-6 py-5 text-right align-top">
                          {p.isBirthday ? (
                            <span className="text-[10px] font-bold text-white bg-[#d97706] px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm">Gratis</span>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className="text-lg font-black text-[#111827]">
                                ${Math.max(0, p.amountToPay).toFixed(2)}
                              </span>
                              {p.baseCost > p.amountToPay && p.amountToPay > 0 && (
                                <span className="text-[11px] text-[#9ca3af] line-through mt-0.5 font-bold">Era ${p.baseCost.toFixed(2)}</span>
                              )}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-5 align-top">
                          {!p.isBirthday && p.amountToPay > 0 ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 relative max-w-[150px]">
                                <span className="absolute left-3 text-[#9ca3af] text-sm font-bold">$</span>
                                <input 
                                  type="number" min="0" step="0.01"
                                  className="w-full pl-7 pr-3 py-2 border border-[#e2e8f0] rounded-xl text-sm font-bold focus:border-[#7040e0] focus:ring-2 focus:ring-[#7040e0]/20 outline-none transition-all disabled:opacity-50 disabled:bg-[#f8fafc]"
                                  value={p.amountGiven || ''}
                                  disabled={p.hasPaid}
                                  placeholder="0.00"
                                  onChange={e => handleUpdatePayment(p.id, Number(e.target.value), p.hasPaid)}
                                />
                              </div>
                              {p.amountGiven > p.amountToPay && (
                                <label className="flex items-center gap-2 mt-2.5 cursor-pointer group/donate w-max">
                                  <input 
                                    type="checkbox" 
                                    checked={p.donateChange} 
                                    disabled={p.hasPaid}
                                    onChange={e => handleToggleDonate(p.id, e.target.checked)} 
                                    className="rounded-md border-[#cbd5e1] text-[#7040e0] focus:ring-[#7040e0] w-4 h-4" 
                                  />
                                  <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest group-hover/donate:text-[#7040e0] transition-colors">
                                    Donar sobrante
                                  </span>
                                </label>
                              )}
                            </div>
                          ) : <span className="text-[#cbd5e1] text-lg font-black">-</span>}
                        </td>
                        
                        <td className="px-6 py-5 text-right align-top">
                          {!p.isBirthday && p.amountToPay > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className={`text-lg font-black ${p.change > 0 ? 'text-[#00d000]' : p.change < 0 ? 'text-[#ef4444]' : 'text-[#9ca3af]'}`}>
                                ${p.change.toFixed(2)}
                              </span>
                              {p.donateChange && p.donatedAmount > 0 && (
                                <span className="text-[9px] font-bold text-[#7040e0] mt-1.5 border border-[#7040e0]/20 bg-[#7040e0]/10 px-2 py-1 rounded-full uppercase tracking-widest">
                                  Donó ${p.donatedAmount.toFixed(2)}
                                </span>
                              )}
                            </div>
                          ) : <span className="text-[#cbd5e1] text-lg font-black">-</span>}
                        </td>
                        
                        <td className={`px-6 py-5 text-center align-top ${idx === finalDivision.length - 1 ? 'rounded-br-2xl' : ''}`}>
                          {!p.isBirthday && p.amountToPay > 0 ? (
                            <button
                              onClick={() => handleUpdatePayment(p.id, p.amountGiven, !p.hasPaid)}
                              className={`w-full py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-transform active:scale-95 ${
                                p.hasPaid 
                                  ? 'bg-[#f1f5f9] text-[#64748b] border border-[#cbd5e1]' 
                                  : 'bg-[#202020] text-white shadow-md shadow-[#202020]/20 hover:bg-[#111827]'
                              }`}
                            >
                              {p.hasPaid ? 'PAGADO' : 'COBRAR'}
                            </button>
                          ) : (
                            <span className="text-[#059669] text-[10px] font-black tracking-widest uppercase border border-[#059669]/20 bg-[#059669]/10 w-full block py-2.5 rounded-xl">RESUELTO</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 bg-[#f8fafc] border-2 border-dashed border-[#e2e8f0] rounded-[1.5rem]">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#e2e8f0] shadow-sm">
                  <Users size={24} className="text-[#94a3b8]" />
                </div>
                <p className="text-xs font-bold text-[#475569] uppercase tracking-widest">Sin datos</p>
                <p className="text-[12px] text-[#64748b] mt-2 font-medium">Agrega personas y platos en el panel lateral.</p>
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}

