'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function BetaSignup() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        // platform removed
    });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setErrorMessage('');

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/v1/beta/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.errors?.[0]?.msg || 'Algo salió mal');
            }

            setStatus('success');
        } catch (err) {
            console.error(err);
            setStatus('error');
            setErrorMessage(err instanceof Error ? err.message : 'Error al registrarse');
        }
    };

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full text-center space-y-6"
                >
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight">¡Ya estás en la lista!</h1>
                    <p className="text-gray-400 text-lg">
                        Gracias por ayudarnos a probar Smashd. Hemos recibido tus datos.
                    </p>
                    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 mt-8">
                        <h3 className="font-semibold text-white mb-2">Próximos pasos:</h3>
                        <ol className="text-left text-gray-400 space-y-3 list-decimal list-inside">
                            <li>Espera a recibir un correo de invitación de Google Play.</li>
                            <li>Acepta la invitación para convertirte en tester.</li>
                            <li>¡Descarga la aplicación y pide algunas hamburguesas! 🍔</li>
                        </ol>
                    </div>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="mt-8 text-yellow-500 hover:text-yellow-400 font-medium"
                    >
                        ← Volver al inicio
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-yellow-600 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-600 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full relative z-10"
            >
                <div className="text-center mb-10">
                    <h1 className="text-5xl font-black italic tracking-tighter mb-4">
                        TEST<span className="text-yellow-500">SMASHD</span>
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Únete a nuestro programa beta exclusivo. Ayúdanos a perfeccionar la experiencia de las hamburguesas en Motril.
                    </p>
                </div>

                <div className="bg-zinc-900/80 backdrop-blur-xl p-8 rounded-2xl border border-zinc-800 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Nombre completo</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all"
                                placeholder="Juan Pérez"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Correo de Gmail <span className="text-yellow-500 text-xs">(Requerido para Play Console)</span>
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full bg-black/50 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all"
                                placeholder="tu@gmail.com"
                            />
                        </div>

                        {status === 'error' && (
                            <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-200 text-sm">
                                {errorMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-lg py-4 rounded-xl transition-all shadow-[0_0_20px_-5px_#EAB308] hover:shadow-[0_0_30px_-5px_#EAB308] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'loading' ? 'Uniéndote...' : 'Unirse al programa beta'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-zinc-600 text-xs mt-8">
                    Al unirte, aceptas recibir actualizaciones por correo electrónico sobre el programa beta.
                </p>
            </motion.div>
        </div>
    );
}
