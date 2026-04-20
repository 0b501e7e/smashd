'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptedTerms) {
      setError('Debes aceptar los términos y condiciones.');
      return;
    }

    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        dateOfBirth,
        address,
        phoneNumber,
        acceptedTerms,
      });

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
                  id="name"
                  placeholder="Nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
              <div className="flex flex-col space-y-1.5">
                <label className="text-sm text-gray-400">Fecha de nacimiento</label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Input
                  id="address"
                  placeholder="Dirección"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Input
                  id="phoneNumber"
                  placeholder="Número de teléfono (ej: +34612345678)"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="acceptedTerms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-4 h-4 accent-yellow-400"
                />
                <label htmlFor="acceptedTerms" className="text-sm text-gray-400">
                  Acepto los términos y condiciones
                </label>
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
