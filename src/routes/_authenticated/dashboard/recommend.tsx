import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Tractor, Calculator, ShieldCheck, Wrench, MapPin } from "lucide-react";
import {
  listTractors,
  listDealers,
  listMaintenance,
  listMyWarranties,
  registerWarranty,
  recommendTractor,
} from "@/lib/catalog.functions";

export const Route = createFileRoute("/_authenticated/dashboard/recommend")({
  head: () => ({ meta: [{ title: "Tools · Escorts Kubota AI" }] }),
  component: ToolsPage,
});

type Tractor = { id: string; brand: string; model: string; hp: number; price_inr: number | null; use_cases: string[]; description: string | null };
type Dealer = { id: string; name: string; region: string; city: string; address: string | null; phone: string | null; latitude: number | null; longitude: number | null };

function ToolsPage() {
  return (
    <DashboardShell role="customer">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Customer tools</h1>
        <p className="mt-1 text-sm text-muted-foreground">AI recommender, EMI calculator, warranty, maintenance & dealer locator.</p>
      </div>
      <Tabs defaultValue="recommend" className="w-full">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="recommend"><Tractor className="h-4 w-4 mr-1"/>Recommend</TabsTrigger>
          <TabsTrigger value="emi"><Calculator className="h-4 w-4 mr-1"/>EMI</TabsTrigger>
          <TabsTrigger value="warranty"><ShieldCheck className="h-4 w-4 mr-1"/>Warranty</TabsTrigger>
          <TabsTrigger value="maintenance"><Wrench className="h-4 w-4 mr-1"/>Service</TabsTrigger>
          <TabsTrigger value="dealers"><MapPin className="h-4 w-4 mr-1"/>Dealers</TabsTrigger>
        </TabsList>
        <TabsContent value="recommend" className="mt-6"><RecommenderTab/></TabsContent>
        <TabsContent value="emi" className="mt-6"><EmiTab/></TabsContent>
        <TabsContent value="warranty" className="mt-6"><WarrantyTab/></TabsContent>
        <TabsContent value="maintenance" className="mt-6"><MaintenanceTab/></TabsContent>
        <TabsContent value="dealers" className="mt-6"><DealersTab/></TabsContent>
      </Tabs>
    </DashboardShell>
  );
}

// ------------- Recommender -------------
function RecommenderTab() {
  const call = useServerFn(recommendTractor);
  const [form, setForm] = useState({ budgetInr: 800000, landAcres: 5, primaryUse: "ploughing and haulage", soilType: "loam", preferBrand: "" });
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true); setErr(null);
    try {
      const res = await call({ data: { ...form, preferBrand: form.preferBrand || undefined } });
      setRecs(res);
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h3 className="font-display text-lg font-semibold">Tell us about your farm</h3>
        <div><Label>Budget (₹)</Label><Input type="number" value={form.budgetInr} onChange={(e)=>setForm({...form, budgetInr:+e.target.value})}/></div>
        <div><Label>Land (acres)</Label><Input type="number" value={form.landAcres} onChange={(e)=>setForm({...form, landAcres:+e.target.value})}/></div>
        <div><Label>Primary use</Label><Textarea rows={2} value={form.primaryUse} onChange={(e)=>setForm({...form, primaryUse:e.target.value})}/></div>
        <div><Label>Soil type</Label><Input value={form.soilType} onChange={(e)=>setForm({...form, soilType:e.target.value})}/></div>
        <div><Label>Preferred brand (optional)</Label>
          <Select value={form.preferBrand} onValueChange={(v)=>setForm({...form, preferBrand:v==='any'?'':v})}>
            <SelectTrigger><SelectValue placeholder="Any"/></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="Farmtrac">Farmtrac</SelectItem>
              <SelectItem value="Powertrac">Powertrac</SelectItem>
              <SelectItem value="Kubota">Kubota</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={submit} disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Get AI recommendations"}
        </Button>
        {err && <p className="text-sm text-destructive">{err}</p>}
      </div>
      <div className="space-y-3">
        {recs.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Answer the questions to see AI-ranked matches.</div>
        ) : recs.map((r)=>(
          <div key={r.id} className="rounded-xl border bg-card p-5 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display font-semibold text-lg">{r.tractor.brand} {r.tractor.model}</div>
                <div className="text-sm text-muted-foreground">{r.tractor.hp} HP · ₹{Number(r.tractor.price_inr).toLocaleString("en-IN")}</div>
              </div>
              <Badge variant="secondary">Match {r.score}%</Badge>
            </div>
            <p className="mt-2 text-sm">{r.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------- EMI -------------
function EmiTab() {
  const [price, setPrice] = useState(800000);
  const [down, setDown] = useState(150000);
  const [rate, setRate] = useState(9.5);
  const [years, setYears] = useState(5);
  const principal = Math.max(0, price - down);
  const r = rate / 12 / 100;
  const n = years * 12;
  const emi = r === 0 ? principal / n : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const total = emi * n;
  const interest = total - principal;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h3 className="font-display text-lg font-semibold">EMI Calculator</h3>
        <div><Label>Tractor price (₹)</Label><Input type="number" value={price} onChange={(e)=>setPrice(+e.target.value)}/></div>
        <div><Label>Down payment (₹)</Label><Input type="number" value={down} onChange={(e)=>setDown(+e.target.value)}/></div>
        <div><Label>Interest rate (% p.a.)</Label><Input type="number" step="0.1" value={rate} onChange={(e)=>setRate(+e.target.value)}/></div>
        <div><Label>Tenure (years)</Label><Input type="number" value={years} onChange={(e)=>setYears(+e.target.value)}/></div>
      </div>
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h3 className="font-display text-lg font-semibold">Your EMI</h3>
        <Row label="Monthly EMI" value={`₹${emi.toLocaleString("en-IN",{maximumFractionDigits:0})}`} highlight/>
        <Row label="Loan principal" value={`₹${principal.toLocaleString("en-IN")}`}/>
        <Row label="Total interest" value={`₹${interest.toLocaleString("en-IN",{maximumFractionDigits:0})}`}/>
        <Row label="Total payment" value={`₹${total.toLocaleString("en-IN",{maximumFractionDigits:0})}`}/>
      </div>
    </div>
  );
}
function Row({label,value,highlight}:{label:string;value:string;highlight?:boolean}){
  return <div className="flex justify-between border-b py-2 last:border-0"><span className="text-sm text-muted-foreground">{label}</span><span className={"font-semibold "+(highlight?"text-primary text-lg":"")}>{value}</span></div>;
}

// ------------- Warranty -------------
function WarrantyTab() {
  const list = useServerFn(listMyWarranties);
  const listT = useServerFn(listTractors);
  const register = useServerFn(registerWarranty);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [form, setForm] = useState({ tractorId: "", serialNumber: "", purchaseDate: new Date().toISOString().slice(0,10), months: 24 });
  const [busy, setBusy] = useState(false);
  const refresh = async () => { setWarranties(await list({})); };
  useEffect(() => { list({}).then(setWarranties); listT({}).then(setTractors); }, []);
  const submit = async () => {
    setBusy(true);
    try { await register({ data: { ...form, tractorId: form.tractorId || null } }); setForm({ tractorId:"", serialNumber:"", purchaseDate: new Date().toISOString().slice(0,10), months:24 }); await refresh(); }
    finally { setBusy(false); }
  };
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h3 className="font-display text-lg font-semibold">Register warranty</h3>
        <div><Label>Tractor</Label>
          <Select value={form.tractorId} onValueChange={(v)=>setForm({...form,tractorId:v})}>
            <SelectTrigger><SelectValue placeholder="Select tractor"/></SelectTrigger>
            <SelectContent>{tractors.map(t=><SelectItem key={t.id} value={t.id}>{t.brand} {t.model}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Serial number</Label><Input value={form.serialNumber} onChange={(e)=>setForm({...form,serialNumber:e.target.value})}/></div>
        <div><Label>Purchase date</Label><Input type="date" value={form.purchaseDate} onChange={(e)=>setForm({...form,purchaseDate:e.target.value})}/></div>
        <div><Label>Coverage (months)</Label><Input type="number" value={form.months} onChange={(e)=>setForm({...form,months:+e.target.value})}/></div>
        <Button onClick={submit} disabled={busy || !form.serialNumber || !form.tractorId} className="w-full">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:"Register"}</Button>
      </div>
      <div className="space-y-3">
        <h3 className="font-display text-lg font-semibold">Your warranties</h3>
        {warranties.length===0? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No warranties yet.</div>
          : warranties.map((w)=>{
              const days = Math.floor((new Date(w.warranty_end).getTime()-Date.now())/86400000);
              const active = days > 0;
              return (
                <div key={w.id} className="rounded-xl border bg-card p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{w.tractor?.brand} {w.tractor?.model}</div>
                      <div className="text-xs text-muted-foreground">SN: {w.serial_number}</div>
                    </div>
                    <Badge variant={active?"default":"destructive"}>{active?`${days} days left`:"Expired"}</Badge>
                  </div>
                  <div className="mt-2 text-sm">Valid till <strong>{w.warranty_end}</strong></div>
                </div>
              );
            })}
      </div>
    </div>
  );
}

// ------------- Maintenance -------------
function MaintenanceTab() {
  const listT = useServerFn(listTractors);
  const listM = useServerFn(listMaintenance);
  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]);
  const [hours, setHours] = useState(0);
  useEffect(() => { listT({}).then((t)=>{ setTractors(t); if (t[0]) setSelected(t[0].id); }); }, []);
  useEffect(() => { if (selected) listM({ data: { tractorId: selected } }).then(setRows); }, [selected]);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label>Tractor</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>{tractors.map(t=><SelectItem key={t.id} value={t.id}>{t.brand} {t.model}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Current engine hours</Label><Input type="number" value={hours} onChange={(e)=>setHours(+e.target.value)}/></div>
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted"><tr><th className="p-3 text-left">Interval</th><th className="p-3 text-left">Task</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Next due</th></tr></thead>
          <tbody>
            {rows.map((r)=>{
              const next = Math.ceil((hours+1)/r.interval_hours) * r.interval_hours;
              const dueIn = next - hours;
              return (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{r.interval_hours}h</td>
                  <td className="p-3">{r.task}{r.notes && <div className="text-xs text-muted-foreground">{r.notes}</div>}</td>
                  <td className="p-3"><Badge variant="outline">{r.category}</Badge></td>
                  <td className="p-3">{next}h <span className="text-xs text-muted-foreground">({dueIn}h to go)</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ------------- Dealers -------------
function DealersTab() {
  const call = useServerFn(listDealers);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [coords, setCoords] = useState<{lat:number;lng:number}|null>(null);
  const [region, setRegion] = useState<string>("all");
  useEffect(() => { call({}).then(setDealers); }, []);
  const requestLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p)=>setCoords({lat:p.coords.latitude,lng:p.coords.longitude}), ()=>{});
  };
  const ranked = useMemo(() => {
    const filtered = region === "all" ? dealers : dealers.filter(d=>d.region===region);
    if (!coords) return filtered;
    const dist = (d:Dealer) => {
      if (d.latitude==null||d.longitude==null) return Infinity;
      const R=6371,toRad=(v:number)=>v*Math.PI/180;
      const dLat=toRad(d.latitude-coords.lat), dLng=toRad(d.longitude-coords.lng);
      const a=Math.sin(dLat/2)**2+Math.cos(toRad(coords.lat))*Math.cos(toRad(d.latitude))*Math.sin(dLng/2)**2;
      return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
    };
    return [...filtered].map(d=>({...d,_km:dist(d)})).sort((a,b)=>a._km-b._km);
  }, [dealers, coords, region]);
  const regions = Array.from(new Set(dealers.map(d=>d.region)));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-48"><Label>Region</Label>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent><SelectItem value="all">All regions</SelectItem>{regions.map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={requestLocation}><MapPin className="h-4 w-4 mr-1"/>{coords?"Location detected":"Use my location"}</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {ranked.map((d:any)=>(
          <div key={d.id} className="rounded-xl border bg-card p-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">{d.name}</div>
                <div className="text-xs text-muted-foreground">{d.city}, {d.region}</div>
              </div>
              {typeof d._km==="number" && isFinite(d._km) && <Badge variant="secondary">{d._km.toFixed(0)} km</Badge>}
            </div>
            {d.address && <p className="mt-2 text-sm">{d.address}</p>}
            {d.phone && <p className="mt-1 text-sm text-muted-foreground">📞 {d.phone}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
