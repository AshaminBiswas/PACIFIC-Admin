import React, { useState, useEffect } from 'react';
import {
  Workflow,
  Plus,
  Play,
  Save,
  CheckCircle2,
  Trash2,
  Edit2,
  ArrowRight,
  MessageSquare,
  Bot,
  HelpCircle,
  Sparkles,
  Layers,
  ChevronDown,
  X,
} from 'lucide-react';
import { wacrmApi } from '../../api/wacrmApi';
import type { WacrmFlow } from '../../types/admin';

export default function WacrmFlows() {
  const [flows, setFlows] = useState<WacrmFlow[]>([]);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFlow, setActiveFlow] = useState<WacrmFlow | null>(null);

  // ─── Simulation Mode State ──────────────────────────────────────────────────
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulationMessages, setSimulationMessages] = useState<
    { sender: 'bot' | 'user'; text: string; buttons?: string[] }[]
  >([]);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const res = await wacrmApi.getFlows();
      if (res.data && res.data.length > 0) {
        setFlows(res.data);
        setActiveFlowId(res.data[0].id);
        setActiveFlow(res.data[0]);
      }
    } catch (err) {
      console.warn('Failed to load flows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  const handleSelectFlow = (flow: WacrmFlow) => {
    setActiveFlowId(flow.id);
    setActiveFlow(flow);
  };

  // ─── Add Node to Canvas ─────────────────────────────────────────────────────
  const handleAddNode = (type: 'message' | 'question' | 'action') => {
    if (!activeFlow) return;
    const newId = `node-${Date.now()}`;
    const newNode = {
      id: newId,
      type,
      data: {
        label:
          type === 'question'
            ? 'Which cubicle height do you need (1980mm or 2100mm)?'
            : type === 'action'
            ? 'Notify Estimation Team'
            : 'Welcome! How can Pacific assist your project?',
        buttons: type === 'question' ? ['1980mm Standard', '2100mm Floor-to-Ceiling'] : undefined,
      },
    };

    const nextNodes = [...(activeFlow.nodes || []), newNode];
    const prevNode = activeFlow.nodes?.[activeFlow.nodes.length - 1];
    const nextEdges = [...(activeFlow.edges || [])];
    if (prevNode) {
      nextEdges.push({
        id: `e-${prevNode.id}-${newId}`,
        source: prevNode.id,
        target: newId,
      });
    }

    const updated = { ...activeFlow, nodes: nextNodes, edges: nextEdges };
    setActiveFlow(updated);
    setFlows((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  };

  const handleSaveFlow = async () => {
    if (!activeFlow) return;
    try {
      await wacrmApi.saveFlow({
        id: activeFlow.id,
        name: activeFlow.name,
        description: activeFlow.description || undefined,
        status: activeFlow.status,
        triggerType: activeFlow.triggerType,
        nodes: activeFlow.nodes || [],
        edges: activeFlow.edges || [],
      });
      alert('Flow canvas saved successfully!');
    } catch (err: any) {
      alert('Save flow failed: ' + err.message);
    }
  };

  // ─── Run Interactive Simulation ─────────────────────────────────────────────
  const handleStartSimulation = () => {
    if (!activeFlow || !activeFlow.nodes?.length) return;
    const firstMessageNode = activeFlow.nodes.find((n) => n.type === 'message' || n.type === 'question') || activeFlow.nodes[0];
    setSimulationMessages([
      {
        sender: 'bot',
        text: firstMessageNode.data?.label || 'Welcome to Pacific Restroom Cubicles!',
        buttons: firstMessageNode.data?.buttons || ['Start Drawing Inquiry', 'Catalog Link'],
      },
    ]);
    setIsSimulatorOpen(true);
  };

  const handleSimulationChoice = (choice: string) => {
    setSimulationMessages((prev) => [
      ...prev,
      { sender: 'user', text: choice },
      {
        sender: 'bot',
        text: `Got it! Selected: "${choice}". Our technical estimator is notified and will generate your formal quote.`,
      },
    ]);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* ─── Header & Flow Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0f0e26]/80 backdrop-blur-md p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7FB706]/20 border border-[#7FB706]/40 flex items-center justify-center text-[#B5F823]">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white tracking-tight">
                Interactive Visual WhatsApp Flows
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                {activeFlow?.status || 'Draft'}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Interactive buttons, branching menus, drawing intake questionnaires, and lead qualification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleStartSimulation}
            className="px-3.5 py-2 rounded-xl bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
          >
            <Play className="w-3.5 h-3.5 fill-purple-300" />
            <span>Simulate Flow</span>
          </button>

          <button
            onClick={handleSaveFlow}
            className="px-4 py-2 rounded-xl bg-[#7FB706] hover:bg-[#8ecb07] text-black font-black text-xs flex items-center gap-1.5 shadow-lg shadow-[#7FB706]/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Flow</span>
          </button>
        </div>
      </div>

      {/* ─── Visual Canvas Layout ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {/* Flows Sidebar */}
        <div className="bg-[#0b0922] border border-white/10 rounded-2xl p-3.5 space-y-2 shadow-xl">
          <span className="text-[10px] uppercase font-bold text-gray-400 px-1">Flow Library</span>
          {flows.map((f) => (
            <button
              key={f.id}
              onClick={() => handleSelectFlow(f)}
              className={`w-full text-left p-2.5 rounded-xl text-xs transition-all ${
                activeFlowId === f.id
                  ? 'bg-[#7FB706]/20 border border-[#7FB706]/50 text-white font-bold'
                  : 'bg-white/5 border border-white/5 text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="truncate">{f.name}</span>
                <span className="text-[9px] uppercase px-1 rounded bg-black/40 text-gray-400">
                  {f.nodes?.length || 0} nodes
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Visual Node Tree Canvas */}
        <div className="lg:col-span-3 bg-[#06041a] border border-white/10 rounded-2xl p-6 min-h-[550px] flex flex-col relative overflow-hidden shadow-2xl bg-[radial-gradient(#15123d_1px,transparent_1px)] [background-size:20px_20px]">
          {/* Node Palette Tools */}
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-white/10 flex-wrap">
            <span className="text-xs font-bold text-gray-400 mr-2 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#B5F823]" /> Node Palette:
            </span>
            <button
              onClick={() => handleAddNode('message')}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white font-medium flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-[#7FB706]" /> + Message
            </button>
            <button
              onClick={() => handleAddNode('question')}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white font-medium flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-purple-400" /> + Question (Buttons)
            </button>
            <button
              onClick={() => handleAddNode('action')}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white font-medium flex items-center gap-1"
            >
              <Plus className="w-3 h-3 text-blue-400" /> + Action
            </button>
          </div>

          {/* Node Flow Representation */}
          <div className="flex-1 flex flex-col items-center space-y-6">
            {activeFlow?.nodes?.map((node: any, idx: number) => {
              const isFirst = idx === 0;
              const isQuestion = node.type === 'question';
              const isAction = node.type === 'action';

              return (
                <React.Fragment key={node.id}>
                  {/* Step Node Card */}
                  <div
                    className={`w-full max-w-md p-4 rounded-2xl border shadow-xl relative transition-all ${
                      isFirst
                        ? 'bg-[#15123d] border-[#7FB706]/40 text-white'
                        : isQuestion
                        ? 'bg-purple-950/40 border-purple-500/40 text-white'
                        : isAction
                        ? 'bg-blue-950/40 border-blue-500/40 text-white'
                        : 'bg-white/5 border-white/10 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/40 text-[#B5F823]">
                        {isFirst ? 'Start Trigger' : node.type}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">#{node.id}</span>
                    </div>

                    <p className="text-xs font-semibold leading-relaxed text-gray-200">
                      {node.data?.label}
                    </p>

                    {/* Interactive Button Options Preview */}
                    {node.data?.buttons && (
                      <div className="mt-3 pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                        {node.data.buttons.map((btnText: string, bIdx: number) => (
                          <span
                            key={bIdx}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-medium"
                          >
                            🔘 {btnText}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Connecting Arrow */}
                  {idx < (activeFlow.nodes?.length || 0) - 1 && (
                    <div className="w-0.5 h-6 bg-gradient-to-b from-[#7FB706] to-purple-400 relative">
                      <div className="w-2 h-2 rounded-full bg-white absolute -bottom-1 -left-[3px]" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── SIMULATION MODAL (LIVE CHAT TESTER) ────────────────────────────── */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#100e2b] border border-white/20 rounded-3xl w-full max-w-sm p-4 shadow-2xl space-y-3 flex flex-col h-[520px]">
            {/* Simulator Phone Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#7FB706] text-black font-black text-xs flex items-center justify-center">
                  PPS
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Pacific WhatsApp Simulator</h4>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Online
                  </p>
                </div>
              </div>
              <button onClick={() => setIsSimulatorOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Chat Thread */}
            <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-[#05031a] rounded-2xl border border-white/5">
              {simulationMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-[#7FB706] text-black font-semibold'
                        : 'bg-[#15123d] text-white border border-white/10'
                    }`}
                  >
                    {m.text}
                  </div>

                  {/* Buttons Choices */}
                  {m.buttons && (
                    <div className="mt-1.5 space-y-1 w-full max-w-[85%]">
                      {m.buttons.map((bText, bIdx) => (
                        <button
                          key={bIdx}
                          onClick={() => handleSimulationChoice(bText)}
                          className="w-full py-1.5 px-3 rounded-xl bg-white/10 hover:bg-[#7FB706]/30 text-white text-[11px] font-bold border border-white/15 text-left flex items-center justify-between transition-all"
                        >
                          <span>{bText}</span>
                          <ArrowRight className="w-3 h-3 text-[#B5F823]" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="text-[10px] text-gray-500 text-center">
              Testing interactive menu branches in real-time
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
