'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/register', { username, email, password });

      const data = await response.json();

      if (response.ok) {
        console.log('Registration successful:', data.message);
        router.push('/login');
      } else {
        setError(data.error || 'Error en el registro. Por favor, inténtelo de nuevo.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Ocurrió un error inesperado. Por favor, inténtelo de nuevo más tarde.');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-yellow-400">Registrarse</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Input
                  id="username"
                  placeholder="Nombre de usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                />
              </div>
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
              <div className="flex flex-col space-y-1.5">
                <Input
                  id="password"
                  placeholder="Contraseña"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                />
              </div>
              {error && <p className="text-red-500">{error}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-yellow-400 text-black hover:bg-yellow-500">Registrarse</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
