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
          // После загрузки пытаемся сделать файл публичным
          this.publishFile(fullPath, (publishErr, publishResponse) => {
            if (!publishErr && publishResponse) {
              response.publicUrl = publishResponse.href;
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
        fields: '_embedded.items.name,_embedded.items.path,_embedded.items.modified,_embedded.items.size,_embedded.items.type',
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

          // Для каждого файла получаем публичную ссылку
          this.getPublicUrlsForFiles(files, (urlsErr, filesWithUrls) => {
            if (urlsErr) {
              console.error('Ошибка получения публичных ссылок:', urlsErr);
              // Возвращаем файлы без публичных ссылок
              callback(null, files);
            } else {
              callback(null, filesWithUrls);
            }
          });
        }
      }
    });
  }

  /**
   * Получает публичные ссылки для файлов
   */
  static getPublicUrlsForFiles(files, callback) {
    if (!files || files.length === 0) {
      callback(null, []);
      return;
    }

    const filesWithUrls = [...files];
    let processedCount = 0;

    // Для каждого файла пытаемся получить публичную ссылку
    files.forEach((file, index) => {
      // Получаем ссылку для скачивания
      this.getDownloadUrl(file.path, (err, downloadResponse) => {
        if (!err && downloadResponse && downloadResponse.href) {
          filesWithUrls[index].downloadUrl = downloadResponse.href;

          // Для изображений создаем специальную ссылку для просмотра
          if (this.isImageFile(file.name)) {
            // Преобразуем ссылку для скачивания в ссылку для просмотра
            const previewUrl = this.convertToPreviewUrl(downloadResponse.href);
            filesWithUrls[index].previewUrl = previewUrl;
          }
        }

        processedCount++;
        if (processedCount === files.length) {
          callback(null, filesWithUrls);
        }
      });
    });
  }

  /**
   * Преобразует ссылку для скачивания в ссылку для просмотра
   */
  static convertToPreviewUrl(downloadUrl) {
    // Если ссылка уже содержит параметры, добавляем к ним
    if (downloadUrl.includes('?')) {
      return downloadUrl.replace('disposition=attachment', 'disposition=inline');
    }
    return downloadUrl;
  }

  /**
   * Получает ссылку для скачивания файла
   */
  static getDownloadUrl(path, callback) {
    const token = Yandex.getToken();
    if (!token) {
      callback(new Error('Токен не найден'), null);
      return;
    }

    createRequest({
      method: 'GET',
      url: `${Yandex.HOST}/resources/download`,
      headers: {
        'Authorization': `OAuth ${token}`
      },
      data: {
        path: encodeURIComponent(path)
      },
      callback: callback
    });
  }

  /**
   * Публикует файл (делает его доступным по публичной ссылке)
   */
  static publishFile(path, callback) {
    const token = Yandex.getToken();
    if (!token) {
      callback(new Error('Токен Яндекс.Диска не установлен'), null);
      return;
    }

    // Сначала публикуем файл
    createRequest({
      method: 'PUT',
      url: `${Yandex.HOST}/resources/publish`,
      headers: {
        'Authorization': `OAuth ${token}`
      },
      data: {
        path: encodeURIComponent(path)
      },
      callback: (err, response) => {
        if (err) {
          callback(err, null);
          return;
        }

        // Затем получаем публичную ссылку
        createRequest({
          method: 'GET',
          url: `${Yandex.HOST}/resources`,
          headers: {
            'Authorization': `OAuth ${token}`
          },
          data: {
            path: encodeURIComponent(path),
            fields: 'public_url'
          },
          callback: (urlErr, urlResponse) => {
            if (urlErr) {
              callback(urlErr, null);
            } else {
              callback(null, urlResponse);
            }
          }
        });
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

    // Простой способ скачивания
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Проверяет, является ли файл изображением
   */
  static isImageFile(filename) {
    if (!filename) return false;
    return /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(filename);
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