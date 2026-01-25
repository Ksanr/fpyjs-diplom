const createRequest = (options = {}) => {
  // Формируем URL с параметрами
  let url = options.url;

  // Для GET и DELETE запросов добавляем параметры в URL
  // Для POST запросов с методом upload Яндекс.Диск ждет параметры в query string
  if (options.data && Object.keys(options.data).length > 0) {
    // Используем URLSearchParams для правильного кодирования
    const params = new URLSearchParams();
    Object.entries(options.data).forEach(([key, value]) => {
      // Не кодируем значение, если оно уже закодировано
      // Для пути (path) Яндекс.Диск ожидает закодированное значение
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

  // Для POST запросов Яндекс.Диск может требовать Content-Type
  if (options.method === 'POST' && !headers['Content-Type']) {
    // Для upload запросов тело пустое, но заголовок нужен
    headers['Content-Type'] = 'application/json';
  }

  // Отправляем запрос
  fetch(url, {
    method: options.method || 'GET',
    headers: headers,
    mode: 'cors',
    credentials: 'omit'
  })
  .then(async response => {
    if (!response.ok) {
      let errorMsg = `HTTP error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorMsg;
      } catch (e) {
        // Не удалось распарсить JSON
      }
      throw new Error(errorMsg);
    }

    // Для DELETE запросов может не быть тела
    if (response.status === 204 || response.status === 202) {
      return { success: true };
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