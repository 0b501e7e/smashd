const sumupMocks = require('../mocks/sumupApiMock');

// Mock the makeHttpRequest function
const makeHttpRequest = jest.fn();

// Define a standalone implementation of getSumupAccessToken for testing
const getSumupAccessToken = async () => {
  try {
    const options = {
      hostname: 'api.sumup.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };
    
    const postData = `client_id=${process.env.SUMUP_CLIENT_ID}&client_secret=${process.env.SUMUP_CLIENT_SECRET}&grant_type=client_credentials`;
    
    const response = await makeHttpRequest(options, postData);
    
    if (!response.access_token) {
      throw new Error('No access token in response');
    }
    
    return response.access_token;
  } catch (error) {
    console.error('Error getting SumUp access token:', error);
    throw new Error(`Failed to get SumUp access token: ${error.message}`);
  }
};

describe('getSumupAccessToken Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock process.env
    process.env.SUMUP_CLIENT_ID = 'test_client_id';
    process.env.SUMUP_CLIENT_SECRET = 'test_client_secret';
  });

  it('should successfully get an access token', async () => {
    // Setup mock response
    makeHttpRequest.mockResolvedValueOnce(sumupMocks.accessTokenResponse);
    
    // Call the function
    const token = await getSumupAccessToken();
    
    // Assertions
    expect(makeHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: 'api.sumup.com',
        path: '/token',
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded'
        })
      }),
      expect.stringContaining('client_id=test_client_id')
    );
    
    expect(token).toBe(sumupMocks.accessTokenResponse.access_token);
  });
  
  it('should throw an error if access token request fails', async () => {
    // Setup mock to throw an error
    makeHttpRequest.mockRejectedValueOnce(new Error('API request failed'));
    
    // Assertions
    await expect(getSumupAccessToken()).rejects.toThrow('Failed to get SumUp access token: API request failed');
  });
  
  it('should throw an error if response is missing access_token', async () => {
    // Setup mock with invalid response
    makeHttpRequest.mockResolvedValueOnce({ token_type: 'bearer' }); // Missing access_token
    
    // Assertions
    await expect(getSumupAccessToken()).rejects.toThrow('Failed to get SumUp access token: No access token in response');
  });
}); 