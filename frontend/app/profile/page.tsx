'use client'

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserProfile, OrderHistoryItem } from '@/hooks/useUserProfile';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 pt-20 space-y-8 animate-pulse">
      <Card className="w-full max-w-2xl bg-yellow-950/50 border-yellow-400/20">
        <CardHeader>
          <Skeleton className="h-6 w-1/4 bg-gray-800" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Skeleton className="h-5 w-1/3 mb-2 bg-gray-800" />
            <Skeleton className="h-4 w-1/2 mb-1 bg-gray-800" />
            <Skeleton className="h-4 w-3/4 bg-gray-800" />
          </div>
          <div>
            <Skeleton className="h-5 w-1/4 mb-2 bg-gray-800" />
            <Skeleton className="h-4 w-1/5 bg-gray-800" />
          </div>
        </CardContent>
      </Card>
      <Card className="w-full max-w-2xl bg-yellow-950/50 border-yellow-400/20">
        <CardHeader>
          <Skeleton className="h-6 w-1/3 bg-gray-800" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="p-4 bg-gray-900/30 rounded-lg border border-gray-700/30 space-y-3">
              <Skeleton className="h-5 w-1/2 bg-gray-800" />
              <Skeleton className="h-4 w-full bg-gray-800" />
              <Skeleton className="h-4 w-3/4 bg-gray-800" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function for status colors
const getStatusColor = (status: string): string => {
  switch (status?.toUpperCase()) {
    case 'PAID':
      return 'text-green-400';
    case 'PENDING':
    case 'CONFIRMED':
    case 'READY':
      return 'text-yellow-300'; // Brighter yellow
    case 'PAYMENT_FAILED':
    case 'EXPIRED':
      return 'text-orange-400'; // Orange for failure
    default:
      return 'text-gray-400'; // Fallback
  }
};

export default function Profile() {
  const { user, orders, isLoading, error, refetchUserProfile } = useUserProfile();
  const router = useRouter();

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle className="font-bold">Error al Cargar el Perfil</AlertTitle>
          <AlertDescription className="text-sm mb-3">
            {error}
          </AlertDescription>
          <Button onClick={() => refetchUserProfile()} variant="destructive" size="sm" className="mt-2">
            Reintentar
          </Button>
        </Alert>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-yellow-400">Por favor, inicia sesión para ver tu perfil.</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch (e) {
      return 'Fecha no válida';
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center p-4 pb-10">
      <Card className="w-full max-w-2xl bg-gray-950 border border-yellow-400/30 mb-12 shadow-lg shadow-yellow-500/5">
        <CardHeader className="pb-4 border-b border-yellow-700/50">
          <CardTitle className="text-2xl font-bold text-yellow-400">Detalles del Perfil</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3 text-white">
          <p><span className="font-semibold text-yellow-300 mr-2">Nombre de usuario:</span> {user.username}</p>
          <p><span className="font-semibold text-yellow-300 mr-2">Correo electrónico:</span> {user.email}</p>
          {user.loyaltyPoints !== undefined && (
            <div className="pt-3 mt-3 border-t border-yellow-700/30 flex items-center space-x-2">
              <span className="font-semibold text-yellow-300">Puntos de Fidelidad:</span>
              <Badge variant="default" className="text-lg font-bold">{user.loyaltyPoints}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="w-full max-w-2xl bg-gray-950 border border-yellow-400/30 shadow-lg shadow-yellow-500/5">
        <CardHeader className="pb-4 border-b border-yellow-700/50">
          <CardTitle className="text-2xl font-bold text-yellow-400">Historial de Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {error && orders.length === 0 && (
            <Alert variant="destructive" className="">
              <AlertTitle className="font-bold">No se pudo cargar el historial de pedidos</AlertTitle>
              <AlertDescription className="text-sm mb-3">
                {error}
              </AlertDescription>
              <Button onClick={() => refetchUserProfile()} variant="destructive" size="sm" className="mt-2">
                Reintentar
              </Button>
            </Alert>
          )}

          {orders.length > 0 ? (
            orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((order: OrderHistoryItem) => (
                <div key={order.id} className="p-4 rounded-lg bg-black/50 border border-yellow-600/30 space-y-2 hover:bg-black/70 hover:border-yellow-500/50 hover:scale-[1.01] transition-all duration-200 cursor-pointer">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-lg text-yellow-300">Order #{order.id}</h3>
                    <span className="text-sm text-gray-300">{formatDate(order.createdAt)}</span>
                  </div>
                  <ul className="text-sm text-white pl-1 space-y-1">
                    {order.items.map((item, index) => (
                      <li key={index}>{item.quantity} x {item.menuItem.name} ({formatCurrency(item.menuItem.price)})</li>
                    ))}
                  </ul>
                  <div className="flex justify-between items-center pt-2 border-t border-yellow-700/50 mt-3">
                    <span className="text-sm font-medium text-gray-300">Estado: <span className={`font-semibold ${getStatusColor(order.status)}`}>{order.status}</span></span>
                    <span className="font-semibold text-white">Total: {formatCurrency(order.total)}</span>
                  </div>
                </div>
              ))
          ) : (!error && !isLoading) ? (
            <p className="text-gray-300 italic">Aún no has realizado ningún pedido.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
