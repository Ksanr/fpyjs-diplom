/**
 * Класс Yandex
 * Используется для управления облаком.
 */
class Yandex {
  static HOST = 'https://cloud-api.yandex.net/v1/disk';
  static publicUrlCache = new Map();

  /**
   * Метод формирования и сохранения токена для Yandex API
   */
  static getToken() {
    let token = localStorage.getItem('yandexToken');

    if (!token) {
      if (App.getModal('tokenManager')) {
        App.getModal('tokenManager').open();
      } else {
        token = prompt('Введите OAuth-токен для Яндекс.Диска:');
        if (token) {
          localStorage.setItem('yandexToken', token);
        }
      }
    }

    return token;
  }

  /**
   * Метод загрузки файла в облако
   */
  static uploadFile(path, url, callback) {
    const token = Yandex.getToken();
    if (!token) {
      callback(new Error('Токен Яндекс.Диска не установлен'), null);
      return;
    }

    const fullPath = path.startsWith('/vk/') ? path : `/vk/${path.replace(/^\/+/, '')}`;

    createRequest({
      method: 'POST',
      url: `${Yandex.HOST}/resources/upload`,
      headers: {
        'Authorization': `OAuth ${token}`
      },
      data: {
        path: fullPath,
        url: url
      },
      callback: (err, response) => {
        if (err) {
          callback(err, response);
        } else {
          if (response && (response.operation_id || response.href)) {
            console.log('Загрузка файла начата:', fullPath);
            callback(null, {
              success: true,
              path: fullPath,
              message: 'Файл поставлен в очередь на загрузку',
              status: 'pending'
            });
          } else {
            callback(null, response);
          }
        }
      }
    });
  }

  /**
   * Получает информацию о файле
   */
  static getFileInfo(path, callback) {
    const token = Yandex.getToken();
    if (!token) {
      callback(new Error('Токен Яндекс.Диска не установлен'), null);
      return;
    }

    createRequest({
      method: 'GET',
      url: `${Yandex.HOST}/resources/files`,
      headers: {
        'Authorization': `OAuth ${token}`
      },
      /*data: {
        path: encodeURIComponent(path),
        fields: 'name,path,modified,size,file,type'
      },*/
      callback: (err, response) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, response);
        }
      }
    });
  }

  /**
   * Получает публичную ссылку на файл
   */
  static getPublicUrl(path, callback) {
    const token = Yandex.getToken();
    if (!token) {
      callback(new Error('Токен Яндекс.Диска не установлен'), null);
      return;
    }

    createRequest({
      method: 'GET',
      url: `${Yandex.HOST}/resources/download`,
      headers: {
        'Authorization': `OAuth ${token}`
      },
      data: {
        path: path
      },
      callback: (err, response) => {
        if (err) {
          callback(err, null);
        } else {
          callback(null, response.href);
        }
      }
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

    Yandex.publicUrlCache.delete(path);

    console.log('Удаление файла по пути:', path);

    const encodedPath = encodeURIComponent(path);
    const url = `${Yandex.HOST}/resources?path=${encodedPath}&permanently=true`;

    console.log('URL для удаления:', url);

    fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `OAuth ${token}`,
        'Accept': 'application/json'
      }
    })
    .then(async response => {
      console.log('Статус ответа при удалении:', response.status, response.statusText);

      if (response.status === 204 || response.status === 202) {
        return { success: true };
      } else if (response.status === 404) {
        throw new Error('Файл не найден: ' + path);
      } else if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Успешное удаление:', data);
      callback(null, data);
    })
    .catch(error => {
      console.error('Ошибка удаления:', error);
      callback(error, null);
    });
  }

  /**
   * Метод получения всех загруженных файлов в облаке
   */
  static getUploadedFiles(callback) {
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
        path: '/vk',
        fields: '_embedded.items.name,_embedded.items.path,_embedded.items.modified,_embedded.items.size,_embedded.items.type,_embedded.items.file',
        limit: 100,
        sort: '-modified'
      },
      callback: (err, response) => {
        if (err) {
          if (err.message && err.message.includes('404')) {
            callback(null, []);
          } else {
            callback(err, null);
          }
        } else {
          console.log('Полный ответ от Яндекс.Диска:', response);
          const files = response._embedded ? response._embedded.items : [];

          // Для каждого файла получаем публичную ссылку для предпросмотра
          this.getPublicUrlsForFiles(files, callback);
        }
      }
    });
  }

  /**
   * Получает публичные ссылки для всех файлов
   */
  static getPublicUrlsForFiles(files, callback) {
    const filesWithUrls = [];
    let processed = 0;
    const total = files.length;

    if (total === 0) {
      callback(null, []);
      return;
    }

    files.forEach((file, index) => {
      const cachedUrl = Yandex.publicUrlCache.get(file.path);

      if (cachedUrl) {
        // Используем кэшированную ссылку
        filesWithUrls[index] = {
          ...file,
          previewUrl: cachedUrl
        };
        processed++;
        checkAllProcessed();
      } else {
        // Получаем новую публичную ссылку
        Yandex.getPublicUrl(file.path, (err, publicUrl) => {
          if (err) {
            console.error('Ошибка при получении публичной ссылки для', file.path, err);
            // Используем файл без ссылки для предпросмотра
            filesWithUrls[index] = {
              ...file,
              previewUrl: null
            };
          } else {
            // Кэшируем полученную ссылку
            Yandex.publicUrlCache.set(file.path, publicUrl);
            filesWithUrls[index] = {
              ...file,
              previewUrl: publicUrl
            };
          }
          processed++;
          checkAllProcessed();
        });
      }
    });

    function checkAllProcessed() {
      if (processed === total) {
        // Сортируем файлы по дате изменения
        const sortedFiles = filesWithUrls.sort((a, b) => {
          return new Date(b.modified) - new Date(a.modified);
        });
        callback(null, sortedFiles);
      }
    }
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
    link.target = '_blank';
    link.download = '';

    try {
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Ошибка при скачивании:', error);
      window.open(url, '_blank');
    }
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
    Yandex.publicUrlCache.clear();
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
              callback: callback
            });
          } else {
            callback(err, null);
          }
        } else {
          callback(null, response);
        }
      }
    });
  }
}