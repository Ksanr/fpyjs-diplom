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
        'Authorization': `OAuth ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        path: encodeURIComponent(fullPath),
        url: url
      },
      callback: (err, response) => {
        if (!err && response) {
          // Получаем информацию о загруженном файле
          this.getFileInfo(fullPath, (infoErr, fileInfo) => {
            if (!infoErr && fileInfo) {
              response.fileInfo = fileInfo;
            }
            callback(err, response);
          });
        } else {
          callback(err, response);
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
      url: `${Yandex.HOST}/resources`,
      headers: {
        'Authorization': `OAuth ${token}`
      },
      data: {
        path: encodeURIComponent(path),
        fields: 'name,path,modified,size,file,type'
      },
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
   * Метод удаления файла из облака
   */
  static removeFile(path, callback) {
    const token = Yandex.getToken();
    if (!token) {
      callback(new Error('Токен Яндекс.Диска не установлен'), null);
      return;
    }

    Yandex.publicUrlCache.delete(path);

    createRequest({
      method: 'DELETE',
      url: `${Yandex.HOST}/resources`,
      headers: {
        'Authorization': `OAuth ${token}`
      },
      data: {
        path: encodeURIComponent(path),
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
          const files = response._embedded ? response._embedded.items : [];

          // Для каждого файла получаем прямую ссылку для скачивания
          const filesWithLinks = files.map(file => {
            // Если у файла уже есть ссылка file, используем ее
            if (file.file) {
              return {
                ...file,
                downloadUrl: file.file
              };
            }

            // Иначе пробуем получить ссылку для скачивания
            const cachedUrl = Yandex.publicUrlCache.get(file.path);
            if (cachedUrl) {
              return {
                ...file,
                downloadUrl: cachedUrl
              };
            }

            return file;
          });

          callback(null, filesWithLinks);
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

    // Простой способ скачивания - создаем ссылку и кликаем
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = '';

    // Пытаемся скачать разными способами
    try {
      // Способ 1: стандартный клик
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Ошибка при скачивании:', error);

      // Способ 2: открываем в новом окне
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