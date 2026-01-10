'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });

      const data = await response.json();
      console.log('Full API response:', data);

      if (response.ok && data.success) {
        console.log('Login successful');
        console.log('Token:', data.data.token);
        console.log('User data:', data.data.user);

        // Store token and user data from the nested structure
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));

        console.log('Stored in localStorage - token:', !!localStorage.getItem('token'));
        console.log('Stored in localStorage - user:', localStorage.getItem('user'));

        window.dispatchEvent(new Event('storage'));

        // Redirect based on user role
        if (data.data.user.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/');
        }
      } else {
        setError(data.error || data.message || 'Error al iniciar sesión. Por favor, inténtelo de nuevo.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Ocurrió un error inesperado. Por favor, inténtelo de nuevo más tarde.');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-yellow-400">Acceder</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Input
                  id="email"
                  placeholder="Correo electrónico"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                />
              </div>
              <div className="flex flex-col space-y-1.5 relative">
                <div className="relative">
                  <Input
                    id="password"
                    placeholder="Contraseña"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <div className="flex justify-end">
                  <a href="/forgot-password" className="text-xs text-yellow-400 hover:underline">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
              </div>
              {error && <p className="text-red-500">{error}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-yellow-400 text-black hover:bg-yellow-500">Acceder</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
