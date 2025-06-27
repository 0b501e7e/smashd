import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { logger } from '../services/logger';
import * as Sentry from '@sentry/react-native';

interface DebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function DebugPanel({ visible, onClose }: DebugPanelProps) {
  const [logs, setLogs] = useState<Array<{ timestamp: string; level: string; message: string; data?: any }>>([]);
  const [activeTab, setActiveTab] = useState<'logs' | 'tests' | 'info'>('logs');

  useEffect(() => {
    if (visible) {
      setLogs(logger.getAllLogs());
    }
  }, [visible]);

  const refreshLogs = () => {
    setLogs(logger.getAllLogs());
  };

  const clearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };

  const testCrash = () => {
    Alert.alert(
      'Test Crash',
      'This will trigger a test crash to verify error reporting works. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Crash!', 
          style: 'destructive',
          onPress: () => {
            // Intentional crash for testing
            throw new Error('Test crash - this is intentional for debugging');
          }
        }
      ]
    );
  };

  const testError = () => {
    logger.error('Test error from debug panel', new Error('Test error'), { source: 'debug_panel' });
    Alert.alert('Test Error', 'Error logged successfully! Check Sentry dashboard.');
  };

  const testNetworkError = () => {
    fetch('https://nonexistent-api.fake/test')
      .catch(error => {
        logger.logNetworkRequest('GET', 'https://nonexistent-api.fake/test', undefined, error);
        Alert.alert('Network Error', 'Network error logged successfully!');
      });
  };

  const shareLogs = () => {
    const logString = logger.getLogsAsString();
    Alert.alert('Logs', logString.slice(-1000) + '\n\n(Last 1000 characters)', [
      { text: 'Close' },
      { 
        text: 'Copy All',
        onPress: () => {
          // In a real app, you'd use Clipboard.setString(logString)
          Alert.alert('Copied', 'Logs copied to clipboard (simulated)');
        }
      }
    ]);
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'ERROR': return '#ff4444';
      case 'WARN': return '#ff8800';
      case 'INFO': return '#0088ff';
      case 'DEBUG': return '#888888';
      default: return '#ffffff';
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        {/* Header */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#333333'
        }}>
          <Text style={{ color: '#FAB10A', fontSize: 18, fontWeight: 'bold' }}>
            Debug Panel
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: '#FAB10A', fontSize: 16 }}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={{ 
          flexDirection: 'row', 
          backgroundColor: '#111111',
          borderBottomWidth: 1,
          borderBottomColor: '#333333'
        }}>
          {(['logs', 'tests', 'info'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={{
                flex: 1,
                padding: 12,
                alignItems: 'center',
                backgroundColor: activeTab === tab ? '#FAB10A' : 'transparent'
              }}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={{
                color: activeTab === tab ? '#000000' : '#FAB10A',
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                textTransform: 'capitalize'
              }}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          {activeTab === 'logs' && (
            <View style={{ flex: 1 }}>
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                padding: 12,
                backgroundColor: '#111111'
              }}>
                <TouchableOpacity 
                  onPress={refreshLogs}
                  style={{ backgroundColor: '#FAB10A', padding: 8, borderRadius: 4 }}
                >
                  <Text style={{ color: '#000000', fontSize: 12 }}>Refresh</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={shareLogs}
                  style={{ backgroundColor: '#0088ff', padding: 8, borderRadius: 4 }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 12 }}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={clearLogs}
                  style={{ backgroundColor: '#ff4444', padding: 8, borderRadius: 4 }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 12 }}>Clear</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={{ flex: 1, padding: 12 }}>
                {logs.length === 0 ? (
                  <Text style={{ color: '#888888', textAlign: 'center', marginTop: 20 }}>
                    No logs available
                  </Text>
                ) : (
                  logs.map((log, index) => (
                    <View key={index} style={{ marginBottom: 8, padding: 8, backgroundColor: '#111111', borderRadius: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ color: getLogColor(log.level), fontSize: 10, fontWeight: 'bold', marginRight: 8 }}>
                          {log.level}
                        </Text>
                        <Text style={{ color: '#666666', fontSize: 10 }}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </Text>
                      </View>
                      <Text style={{ color: '#ffffff', fontSize: 12 }}>
                        {log.message}
                      </Text>
                      {log.data && (
                        <Text style={{ color: '#888888', fontSize: 10, marginTop: 4 }}>
                          {JSON.stringify(log.data, null, 2)}
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {activeTab === 'tests' && (
            <ScrollView style={{ flex: 1, padding: 16 }}>
              <Text style={{ color: '#FAB10A', fontSize: 16, fontWeight: 'bold', marginBottom: 16 }}>
                Test Error Reporting
              </Text>

              <TouchableOpacity 
                onPress={testError}
                style={{ backgroundColor: '#ff8800', padding: 12, borderRadius: 8, marginBottom: 12 }}
              >
                <Text style={{ color: '#ffffff', textAlign: 'center', fontWeight: 'bold' }}>
                  Test Error Log
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={testNetworkError}
                style={{ backgroundColor: '#0088ff', padding: 12, borderRadius: 8, marginBottom: 12 }}
              >
                <Text style={{ color: '#ffffff', textAlign: 'center', fontWeight: 'bold' }}>
                  Test Network Error
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={testCrash}
                style={{ backgroundColor: '#ff4444', padding: 12, borderRadius: 8, marginBottom: 12 }}
              >
                <Text style={{ color: '#ffffff', textAlign: 'center', fontWeight: 'bold' }}>
                  Test Crash (BE CAREFUL!)
                </Text>
              </TouchableOpacity>

              <Text style={{ color: '#888888', fontSize: 12, marginTop: 20 }}>
                These tests help verify that error reporting is working correctly.
                Check your Sentry dashboard after running tests.
              </Text>
            </ScrollView>
          )}

          {activeTab === 'info' && (
            <ScrollView style={{ flex: 1, padding: 16 }}>
              <Text style={{ color: '#FAB10A', fontSize: 16, fontWeight: 'bold', marginBottom: 16 }}>
                App Information
              </Text>

              <Text style={{ color: '#ffffff', marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold' }}>Version:</Text> 1.0.3
              </Text>
              
              <Text style={{ color: '#ffffff', marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold' }}>Environment:</Text> {__DEV__ ? 'Development' : 'Production'}
              </Text>
              
              <Text style={{ color: '#ffffff', marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold' }}>Platform:</Text> {require('react-native').Platform.OS}
              </Text>

              <Text style={{ color: '#ffffff', marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold' }}>API URL:</Text> {process.env.EXPO_PUBLIC_API_URL || 'Not set'}
              </Text>

              <Text style={{ color: '#ffffff', marginBottom: 16 }}>
                <Text style={{ fontWeight: 'bold' }}>Total Logs:</Text> {logs.length}
              </Text>

              <Text style={{ color: '#888888', fontSize: 12 }}>
                This debug panel helps you troubleshoot app issues. 
                In production, you can access this by tapping the logo 5 times quickly.
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
} 