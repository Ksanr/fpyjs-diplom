/**
 * Основная функция для совершения запросов по Yandex API.
 */
const createRequest = (options = {}) => {
  const xhr = new XMLHttpRequest();
  xhr.responseType = 'json';

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

  // Открываем соединение
  xhr.open(options.method || 'GET', url);

  // Устанавливаем заголовки
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
      console.log(`Заголовок: ${key}: ${value.substring(0, 20)}...`);
    });
  }

  // Обработчик загрузки
  xhr.onload = () => {
    console.log(`Ответ получен: ${xhr.status} ${xhr.statusText}`);

    if (xhr.status >= 200 && xhr.status < 300) {
      if (options.callback) {
        options.callback(null, xhr.response);
      }
    } else {
      const error = new Error(`HTTP error ${xhr.status}: ${xhr.statusText}`);
      console.error('Ошибка HTTP:', xhr.status, xhr.response);
      if (options.callback) {
        options.callback(error, xhr.response);
      }
    }
  };

  // Обработчик ошибок
  xhr.onerror = () => {
    console.error('Сетевая ошибка при выполнении запроса');
    if (options.callback) {
      options.callback(new Error('Network error'), null);
    }
  };

  try {
    xhr.send();
  } catch (err) {
    console.error('Исключение при отправке запроса:', err);
    if (options.callback) {
      options.callback(err, null);
    }
  }
};