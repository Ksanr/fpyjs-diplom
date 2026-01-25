/**
 * Основная функция для совершения запросов по Yandex API.
 */
const createRequest = (options = {}) => {
  // Для простоты используем fetch вместо XMLHttpRequest
  // Это лучше работает с CORS

  // Формируем URL с параметрами
  let url = options.url;
  if (options.data && Object.keys(options.data).length > 0) {
    const params = new URLSearchParams();
    Object.entries(options.data).forEach(([key, value]) => {
      params.append(key, value);
    });
    url += `?${params.toString()}`;
  }

  console.log(`Отправка запроса: ${options.method} ${url}`);

  // Настраиваем заголовки
  const headers = {
    ...options.headers,
    'Accept': 'application/json'
  };

  // Отправляем запрос
  fetch(url, {
    method: options.method || 'GET',
    headers: headers,
    mode: 'cors', // Явно указываем режим CORS
    credentials: 'omit' // Не отправляем куки
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    if (options.callback) {
      options.callback(null, data);
    }
  })
  .catch(error => {
    console.error('Ошибка при выполнении запроса:', error);
    if (options.callback) {
      options.callback(error, null);
    }
  });
};