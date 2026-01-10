'use client'

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage(data.message || 'Si existe una cuenta asociada, recibirás un correo para restablecer tu contraseña.');
            } else {
                setStatus('error');
                setMessage(data.error || data.message || 'Error al solicitar el restablecimiento.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Ocurrió un error. Inténtalo de nuevo.');
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-gray-900 border-gray-700">
                <CardHeader>
                    <div className="flex items-center mb-4">
                        <a href="/login" className="text-gray-400 hover:text-white flex items-center">
                            <ArrowLeft size={20} className="mr-1" /> Volver
                        </a>
                    </div>
                    <CardTitle className="text-yellow-400">Recuperar Contraseña</CardTitle>
                </CardHeader>
                <CardContent>
                    {status === 'success' ? (
                        <div className="text-green-400 text-center p-4 border border-green-900 rounded bg-green-900/20">
                            {message}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <p className="text-gray-300 text-sm">
                                    Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
                                </p>
                                <Input
                                    type="email"
                                    placeholder="Correo electrónico"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-gray-800 border-gray-700 text-white"
                                    required
                                />
                                {status === 'error' && <p className="text-red-500 text-sm">{message}</p>}
                                <Button
                                    type="submit"
                                    className="w-full bg-yellow-400 text-black hover:bg-yellow-500"
                                    disabled={status === 'loading'}
                                >
                                    {status === 'loading' ? 'Enviando...' : 'Enviar instrucciones'}
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
