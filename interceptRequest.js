//可配置的白名单 - 允许访问的接口列表
const WHITELIST= {
	'https://api.example.com/allowed': '1',
	'/^https:\\/\\/cdn\\.example\\.com\\/.*/': 'regex' 
}

// 检查URL是否在白名单中
function isUrlAllowed(url) {
    // 遍历对象的键（即白名单模式）
    return Object.keys(WHITELIST).some(pattern => {
        // 检查该模式是否标记为正则表达式
        const isRegexPattern = WHITELIST[pattern] === 'regex';
        
        if (isRegexPattern || (pattern.startsWith('/') && pattern.endsWith('/'))) {
            // 正则表达式模式
            const regexPattern = isRegexPattern ? pattern : pattern.slice(1, -1);
            const regex = new RegExp(regexPattern);
            return regex.test(url);
        }
        
        // 精确匹配或路径前缀匹配
        return url === pattern || url.startsWith(pattern);
    });
}
// 拦截fetch请求
const originalFetch = window.fetch;
window.fetch = async function(input, init) {
	const url = typeof input === 'string' ? input : input.url;
	// 请求拦截 - 权限检查
	console.log(await isZfbEnvironment())
	if (!isUrlAllowed(url)) {
		console.warn('[请求拦截] 接口不在允许列表中:', url);
		return new Response(JSON.stringify({
			code: 403,
			message: '请求被拦截: 接口未授权'
		}), {
			status: 403,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
	console.log('[请求放行]', url);
	return originalFetch(input, init);
};

// 拦截XMLHttpRequest
const originalXhrOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
	// 保存URL用于后续检查
	this._requestUrl = url;
	// 保存原始的send方法
	const originalSend = this.send;
	// 重写send方法进行权限检查
	this.send = (data) => {
		if (!isUrlAllowed(this._requestUrl)) {
			console.warn('[请求拦截] 接口不在允许列表中:', this._requestUrl);
			// 模拟返回拦截响应
			this.status = 403;
			this.statusText = 'Forbidden';
			this.responseText = JSON.stringify({
				code: 403,
				message: '请求被拦截: 接口未授权'
			});
			// 触发状态变更事件
			if (this.onreadystatechange) this.onreadystatechange();
			if (this.onload) this.onload();
			return;
		}

		console.log('[请求放行]', this._requestUrl);
		originalSend.call(this, data);
	};
	return originalXhrOpen.call(this, method, url, async, user, password);
};

//判断是否是支付宝小程序功能
function isZfbEnvironment() {  
  return new Promise((resolve) => {  
    console.log('判断是否是支付宝环境');  
      
    if (typeof my === 'undefined' || typeof my.getEnv !== 'function') {  
      resolve(false);  
      return;  
    }  
  
    const timeout = setTimeout(() => {  
      resolve(false);  
    }, 5000); // 5秒超时  
  
    my.getEnv((res) => {  
      clearTimeout(timeout);  
      resolve(!!res && res.miniprogram);  
    });  
  });  
}