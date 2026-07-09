import React, { useState, useEffect } from 'react';
import { Bot, Folder, Plus, MessageSquare, Clock, Blocks } from 'lucide-react';
import { api } from '../lib/api';
import { useToasts } from './Toast';

export const Sidebar: React.FC<{ activeTab: 'work' | 'chat', setActiveTab: (t: 'work' | 'chat') => void, onNewTask: () => void }> = ({ activeTab, setActiveTab, onNewTask }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const { addToast } = useToasts();

  useEffect(() => {
    if (activeTab === 'work') {
      api.getProjects().then(res => setProjects(res.projects)).catch(() => {});
    } else {
      api.getChats().then(res => setChats(res.chats)).catch(() => {});
    }
  }, [activeTab]);

  const handleAction = async (action: string) => {
    try {
      if (action === 'plugins') {
        const res = await api.getPlugins();
        addToast({ type: 'success', title: 'Plugins Loaded', message: `Found ${res.plugins.length} active plugins.` });
      } else if (action === 'tasks') {
        const res = await api.getScheduledTasks();
        addToast({ type: 'success', title: 'Scheduled Tasks', message: `Found ${res.tasks.length} tasks.` });
      } else if (action === 'bridge') {
        const res = await api.getWebBridgeStatus();
        addToast({ type: 'success', title: 'WebBridge Status', message: `Status: ${res.status} | Latency: ${res.latency}` });
      } else if (action === 'upgrade') {
        addToast({ type: 'success', title: 'Upgrade', message: 'Redirecting to upgrade portal...' });
      }
    } catch (e) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to complete action.' });
    }
  };

  return (
    <div className="w-[260px] h-full bg-[#f8f9fa] border-r border-[#e5e7eb] flex flex-col pt-3 pb-4">
      {/* Tab Switcher */}
      <div className="flex px-3 mb-6">
        <div className="flex w-full bg-white rounded-lg border border-[#e5e7eb] p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('work')}
            className={`flex-1 py-1.5 text-[13px] font-medium rounded-md flex justify-center items-center gap-2 transition-all ${
              activeTab === 'work' ? 'bg-[#f3f4f6] text-black shadow-sm' : 'text-gray-500 hover:text-black'
            }`}
          >
            <Folder size={14} /> Work
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-1.5 text-[13px] font-medium rounded-md flex justify-center items-center gap-2 transition-all ${
              activeTab === 'chat' ? 'bg-[#f3f4f6] text-black shadow-sm' : 'text-gray-500 hover:text-black'
            }`}
          >
            <MessageSquare size={14} /> Chat
          </button>
        </div>
      </div>

      {/* New Task Button */}
      <div className="px-3 mb-4">
        <button 
          onClick={onNewTask}
          className="w-full flex items-center justify-between py-2 px-3 hover:bg-[#e5e7eb] rounded-lg transition-colors">
          <div className="flex items-center gap-2 text-[14px] font-medium text-gray-800">
            <Plus size={16} />
            {activeTab === 'work' ? 'New Task' : 'New Chat'}
          </div>
          <span className="text-[11px] text-gray-400 border border-gray-200 px-1.5 rounded bg-white font-mono">Ctrl K</span>
        </button>
      </div>

      {/* Navigation */}
      <div className="px-3 flex flex-col gap-1 mb-8">
        <button onClick={() => handleAction('plugins')} className="flex items-center gap-3 py-2 px-3 hover:bg-[#e5e7eb] rounded-lg text-[13px] font-medium text-gray-700 transition-colors">
          <Blocks size={16} className="text-gray-500" /> Plugins
        </button>
        <button onClick={() => handleAction('tasks')} className="flex items-center gap-3 py-2 px-3 hover:bg-[#e5e7eb] rounded-lg text-[13px] font-medium text-gray-700 transition-colors">
          <Clock size={16} className="text-gray-500" /> Scheduled Tasks
        </button>
        <button onClick={() => handleAction('bridge')} className="flex items-center gap-3 py-2 px-3 hover:bg-[#e5e7eb] rounded-lg text-[13px] font-medium text-gray-700 transition-colors">
          <Bot size={16} className="text-gray-500" /> WebBridge
        </button>
      </div>

      {/* Projects Section */}
      {activeTab === 'work' && (
        <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
          <h3 className="text-[11px] uppercase font-semibold text-gray-400 mb-2 px-3 tracking-wider">Project</h3>
          {projects.map((proj) => (
            <div key={proj.id} className="bg-[#e5e7eb]/50 rounded-lg p-2 mb-2 transition-colors hover:bg-[#e5e7eb]">
              <div className="flex items-center gap-2 text-[13px] text-gray-800 font-medium px-1 mb-1">
                <Folder size={14} className="text-gray-500" /> {proj.name}
              </div>
              <div className="flex items-center gap-2 text-[12px] text-gray-600 px-1 py-1 hover:bg-white rounded cursor-pointer transition-colors">
                <span className={`w-1.5 h-1.5 rounded-full ${proj.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                {proj.active_task}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chats Section */}
      {activeTab === 'chat' && (
        <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
          <h3 className="text-[11px] uppercase font-semibold text-gray-400 mb-2 px-3 tracking-wider">Chats</h3>
          <div className="flex flex-col gap-1 mt-2">
            {chats.map((chat) => (
              <div key={chat.id} className="text-[12px] text-gray-600 px-3 py-2 hover:bg-[#e5e7eb] rounded-lg cursor-pointer transition-colors">
                <div className="font-medium truncate">{chat.title}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{chat.date}</div>
              </div>
            ))}
            {chats.length === 0 && (
              <div className="text-[12px] text-gray-500 px-3 mt-2">Your chats will appear here</div>
            )}
          </div>
        </div>
      )}

      {/* Footer User Area */}
      <div className="mt-auto px-4 pt-4 border-t border-[#e5e7eb] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
            AK
          </div>
          <span className="text-[13px] font-medium text-gray-800">Ankit Ku...</span>
        </div>
        <button onClick={() => handleAction('upgrade')} className="text-[11px] font-semibold border border-gray-200 px-2 py-1 rounded-full text-gray-600 hover:bg-gray-50 transition-colors">
          Upgrade
        </button>
      </div>
    </div>
  );
};
