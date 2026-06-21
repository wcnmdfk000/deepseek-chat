exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: '只支持 POST 请求' })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { messages, temperature, max_tokens } = body;

    if (!messages) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '缺少 messages 参数' })
      };
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        stream: true,
        temperature: temperature || 0.9,
        max_tokens: max_tokens || 2000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify(error)
      };
    }

    // 流式转发
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
    }

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/event-stream'
      },
      body: result
    };

  } catch(error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};