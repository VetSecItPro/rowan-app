'use client';

import { motion } from 'framer-motion';
import { Download, Smartphone, Monitor, Share, Plus, Zap, Shield, Bell } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function InstallSection() {
    const { isInstalled, isIOS, isAndroid, canPrompt, promptInstall } = usePWAInstall();

    if (isInstalled) {
        return null;
    }

    return (
        <section className="relative py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: false }}
                    transition={{ duration: 0.5 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/10 via-cyan-600/10 from-blue-500/20 to-teal-500/20 backdrop-blur-xl border border-blue-400/30 p-4 sm:p-5"
                >
                    {/* Header */}
                    <div className="text-center mb-4">
                        <div className="inline-flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20 flex items-center justify-center">
                                <Download className="w-4 h-4 text-white" />
                            </div>
                            <h3 className="text-lg font-display font-bold text-white">
                                Install Rowan
                            </h3>
                        </div>
                        <p className="text-xs text-gray-400">
                            Add to your home screen for the best experience
                        </p>
                    </div>

                    {/* Install Button (when browser supports it) */}
                    {canPrompt ? (
                        <div className="flex justify-center">
                            <button
                                onClick={promptInstall}
                                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Install App
                            </button>
                        </div>
                    ) : (
                        /* Platform-specific install cards */
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* iOS Card */}
                            <div className={`relative p-3 rounded-xl transition-all ${isIOS ? 'bg-blue-500/20 ring-2 ring-blue-500/50' : 'bg-gray-800/50'}`}>
                                {isIOS && (
                                    <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full">
                                        Your Device
                                    </span>
                                )}
                                <div className="flex items-center gap-2 mb-2">
                                    <Smartphone className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs font-semibold text-white">iOS</span>
                                </div>
                                <ol className="text-[11px] text-gray-400 space-y-1">
                                    <li className="flex items-center gap-1">
                                        <span className="text-blue-500 font-bold">1.</span> Tap <Share className="inline w-3 h-3 text-blue-500" /> Share
                                    </li>
                                    <li className="flex items-center gap-1">
                                        <span className="text-blue-500 font-bold">2.</span> <Plus className="inline w-3 h-3 text-blue-500" /> Add to Home Screen
                                    </li>
                                    <li className="flex items-center gap-1">
                                        <span className="text-blue-500 font-bold">3.</span> Tap Add
                                    </li>
                                </ol>
                            </div>

                            {/* Android Card */}
                            <div className={`relative p-3 rounded-xl transition-all ${isAndroid ? 'bg-blue-500/20 ring-2 ring-blue-500/50' : 'bg-gray-800/50'}`}>
                                {isAndroid && (
                                    <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full">
                                        Your Device
                                    </span>
                                )}
                                <div className="flex items-center gap-2 mb-2">
                                    <Smartphone className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs font-semibold text-white">Android</span>
                                </div>
                                <ol className="text-[11px] text-gray-400 space-y-1">
                                    <li className="flex items-center gap-1">
                                        <span className="text-blue-500 font-bold">1.</span> Open in Chrome
                                    </li>
                                    <li className="flex items-center gap-1">
                                        <span className="text-blue-500 font-bold">2.</span> Tap menu (⋮)
                                    </li>
                                    <li className="flex items-center gap-1">
                                        <span className="text-blue-500 font-bold">3.</span> Add to Home screen
                                    </li>
                                </ol>
                            </div>

                            {/* Desktop Card */}
                            <div className={`relative p-3 rounded-xl transition-all ${!isIOS && !isAndroid ? 'bg-blue-500/20 ring-2 ring-blue-500/50' : 'bg-gray-800/50'}`}>
                                {!isIOS && !isAndroid && (
                                    <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full">
                                        Your Device
                                    </span>
                                )}
                                <div className="flex items-center gap-2 mb-2">
                                    <Monitor className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs font-semibold text-white">Desktop</span>
                                </div>
                                <ol className="text-[11px] text-gray-400 space-y-1">
                                    <li className="flex items-center gap-1">
                                        <span className="text-blue-500 font-bold">1.</span> Use Chrome or Edge
                                    </li>
                                    <li className="flex items-center gap-1">
                                        <span className="text-blue-500 font-bold">2.</span> Click <Download className="inline w-3 h-3 text-blue-500" /> in URL bar
                                    </li>
                                    <li className="flex items-center gap-1">
                                        <span className="text-blue-500 font-bold">3.</span> Click Install
                                    </li>
                                </ol>
                            </div>
                        </div>
                    )}

                    {/* Benefits */}
                    <div className="flex items-center justify-center gap-4 sm:gap-6 mt-3 text-[10px] sm:text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-blue-500" /> Lightning fast</span>
                        <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-blue-500" /> Works offline</span>
                        <span className="flex items-center gap-1"><Bell className="w-3 h-3 text-blue-500" /> Push notifications</span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
