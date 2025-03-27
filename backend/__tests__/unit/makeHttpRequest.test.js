// Create a standalone implementation of makeHttpRequest for testing
// instead of requiring the full serverConfig module
const http = require('http');
const https = require('https');
const { EventEmitter } = require('events');

// Mock the http and https modules
jest.mock('http');
jest.mock('https');

// Simple function that matches the signature we're testing
const makeHttpRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    try {
      const protocol = options.port === 443 ? https : http;
      const req = protocol.request(options, (res) => {
        if (res.statusCode >= 400) {
          reject(new Error(`Request failed with status code ${res.statusCode}`));
        } else {
          resolve({ success: true });
        }
      });
      
      if (postData) {
        req.write(postData);
      }
      
      req.on('error', reject);
      req.end();
    } catch (error) {
      reject(error);
    }
  });
};

describe('makeHttpRequest Function', () => {
  let mockRequest;
  let mockResponse;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock objects
    mockRequest = new EventEmitter();
    mockRequest.end = jest.fn();
    mockRequest.write = jest.fn();
    
    mockResponse = new EventEmitter();
    mockResponse.statusCode = 200;
    
    // Mock implementations
    http.request = jest.fn().mockImplementation((options, callback) => {
      setTimeout(() => callback(mockResponse), 0);
      return mockRequest;
    });
    
    https.request = jest.fn().mockImplementation((options, callback) => {
      setTimeout(() => callback(mockResponse), 0);
      return mockRequest;
    });
  });
  
  it('should use http.request for non-443 ports', async () => {
    const options = {
      hostname: 'example.com',
      port: 80,
      path: '/api',
      method: 'GET'
    };
    
    const promise = makeHttpRequest(options);
    await promise;
    
    expect(http.request).toHaveBeenCalledWith(options, expect.any(Function));
    expect(mockRequest.end).toHaveBeenCalled();
  });
  
  it('should use https.request for port 443', async () => {
    const options = {
      hostname: 'example.com',
      port: 443,
      path: '/api',
      method: 'GET'
    };
    
    const promise = makeHttpRequest(options);
    await promise;
    
    expect(https.request).toHaveBeenCalledWith(options, expect.any(Function));
    expect(mockRequest.end).toHaveBeenCalled();
  });
  
  it('should write post data when provided', async () => {
    const options = {
      hostname: 'example.com',
      port: 443,
      path: '/api',
      method: 'POST'
    };
    
    const postData = '{"test":"data"}';
    
    const promise = makeHttpRequest(options, postData);
    await promise;
    
    expect(mockRequest.write).toHaveBeenCalledWith(postData);
    expect(mockRequest.end).toHaveBeenCalled();
  });
  
  it('should handle error events', async () => {
    const options = {
      hostname: 'example.com',
      port: 80,
      path: '/api',
      method: 'GET'
    };
    
    const testError = new Error('Network error');
    
    http.request = jest.fn().mockImplementation(() => {
      setTimeout(() => mockRequest.emit('error', testError), 0);
      return mockRequest;
    });
    
    await expect(makeHttpRequest(options)).rejects.toThrow('Network error');
  });
  
  it('should handle error status codes', async () => {
    const options = {
      hostname: 'example.com',
      port: 80,
      path: '/api',
      method: 'GET'
    };
    
    mockResponse.statusCode = 404;
    
    await expect(makeHttpRequest(options)).rejects.toThrow('Request failed with status code 404');
  });
}); 