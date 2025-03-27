'use client'

import { useState, useEffect } from 'react';

export default function TestPage() {
  const [testResult, setTestResult] = useState<string>('Loading...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testApi = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL?.endsWith('/') 
          ? process.env.NEXT_PUBLIC_API_URL.slice(0, -1) 
          : process.env.NEXT_PUBLIC_API_URL;
        
        console.log('Testing API endpoint:', `${apiUrl}/v1/menu`);
        
        const response = await fetch(`${apiUrl}/v1/menu`);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Data received:', data);
        
        if (data && data.length > 0) {
          setTestResult(`API working! Found ${data.length} menu items.`);
        } else {
          setTestResult('API responded but no menu items found.');
        }
      } catch (err) {
        console.error('Error testing API:', err);
        setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
        setTestResult('Failed to connect to API');
      }
    };

    testApi();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4">
      <h1 className="text-3xl font-bold mb-6 text-yellow-400">API Connection Test</h1>
      <div className="bg-yellow-900 p-6 rounded-lg w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4 text-yellow-400">Test Result:</h2>
        <div className="bg-black p-4 rounded">
          <p className="text-yellow-400">{testResult}</p>
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2 text-yellow-400">API URL:</h3>
          <code className="bg-black p-2 block rounded">{process.env.NEXT_PUBLIC_API_URL}/v1/menu</code>
        </div>
      </div>
    </div>
  );
} 