/**
 * Класс Yandex
 * Используется для управления облаком.
 */
class Yandex {
  static HOST = 'https://cloud-api.yandex.net/v1/disk';

  /**
   * Метод формирования и сохранения токена для Yandex API
   */
  static getToken() {
    let token = localStorage.getItem('yandexToken');

    if (!token) {
      console.log('Токен Яндекс.Диска не найден. Открываем окно управления токенами...');

      if (App.getModal('tokenManager')) {
        App.getModal('tokenManager').open();
      } else {
        token = prompt('Введите OAuth-токен для Яндекс.Диска:');
        if (token) {
          localStorage.setItem('yandexToken', token);
        }
      }

      return token;
    }

    return token;
  }

  /**
   * Метод загрузки файла в облако
   */
  static uploadFile(path, url, callback) {
    const token = Yandex.getToken();
    if (!token) {
      callback(new Error('Токен Яндекс.Диска не установлен. Установите токен в окне управления токенами.'), null);
      return;
    }

    createRequest({
      method: 'POST',
      url: `${Yandex.HOST}/resources/upload`,
      headers: {
        'Authorization': `OAuth ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        path: path,
        url: url
      },
      callback: callback
    });
  }

  /**
   * Метод удаления файла из облака
   */
  static removeFile(path, callback) {
    const token = Yandex.getToken();
    if (!token) {
      callback(new Error('Токен Яндекс.Диска не установлен'), null);
      return;
    }

    createRequest({
      method: 'DELETE',
      url: `${Yandex.HOST}/resources`,
      headers: {
        'Authorization': `OAuth ${token}`
      },
      data: {
        path: path,
        permanently: true
      },
      callback: callback
    });
  }

  /**
   * Метод получения всех загруженных файлов в облаке
   */
  static getUploadedFiles(callback) {
    const token = Yandex.getToken();
    if (!token) {
      callback(new Error('Токен Яндекс.Диска не установлен. Установите токен в окне управления токенами.'), null);
      return;
    }

    createRequest({
      method: 'GET',
      url: `${Yandex.HOST}/resources`,
      headers: {
        'Authorization': `OAuth ${token}`
      },
      data: {
        path: '/vk',
        fields: '_embedded.items.name,_embedded.items.path,_embedded.items.modified,_embedded.items.size,_embedded.items.file',
        limit: 100
      },
      callback: (err, response) => {
        if (err) {
          // Если папка не существует (ошибка 404), возвращаем пустой массив
          if (err.message && err.message.includes('404')) {
            callback(null, []);
          } else {
            callback(err, null);
          }
        } else {
          // Извлекаем файлы из ответа
          const files = response._embedded ? response._embedded.items : [];
          callback(null, files);
        }
      }
    });
  }

  /**
   * Метод скачивания файлов
   */
  static downloadFileByUrl(url) {
    if (!url) {
      alert('Не указан URL для скачивания');
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Устанавливает новый токен
   */
  static setToken(token) {
    if (token && token.trim()) {
      localStorage.setItem('yandexToken', token.trim());
      return true;
    }
    return false;
  }

  /**
   * Очищает токен
   */
  static clearToken() {
    localStorage.removeItem('yandexToken');
  }

  /**
   * Проверяет существование папки /vk и создает ее если нужно
   */
  static ensureVkFolder(callback) {
    const token = Yandex.getToken();
    if (!token) {
      callback(new Error('Токен Яндекс.Диска не установлен'), null);
      return;
    }

    createRequest({
      method: 'GET',
      url: `${Yandex.HOST}/resources`,
      headers: {
        'Authorization': `OAuth ${token}`
      },
      data: {
        path: '/vk'
      },
      callback: (err, response) => {
        if (err) {
          // Если папка не существует (ошибка 404), создаем ее
          if (err.message && err.message.includes('404')) {
            createRequest({
              method: 'PUT',
              url: `${Yandex.HOST}/resources`,
              headers: {
                'Authorization': `OAuth ${token}`
              },
              data: {
                path: '/vk'
              },
              callback: (createErr, createResponse) => {
                if (createErr) {
                  callback(createErr, null);
                } else {
                  callback(null, createResponse);
                }
              }
            });
          } else {
            callback(err, null);
          }
        } else {
          // Папка уже существует
          callback(null, response);
        }
      }
    });
  }
}