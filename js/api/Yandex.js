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
   * Получает прямую ссылку на скачивание по публичной ссылке (public_key)
   */
  static getPublicDownloadUrl(publicKey, callback) {
    const timeout = setTimeout(() => {
      callback(new Error('Timeout при получении downloadUrl'), null);
    }, 10000);

    const wrappedCallback = (err, result) => {
      clearTimeout(timeout);
      callback(err, result);
    };

    createRequest({
      method: 'GET',
      url: `${Yandex.HOST}/public/resources/download`,
      headers: {},
      data: { public_key: publicKey },
      callback: (err, response) => {
        if (err) {
          wrappedCallback(err, null);
        } else {
          wrappedCallback(null, response.href);
        }
      }
    });
  }

  /**
   * Получает публичную ссылку на файл (публикует, если необходимо)
   * Возвращает прямую ссылку на скачивание (для img и скачивания)
   */
  static getPublicUrl(path, callback) {
    const timeout = setTimeout(() => {
      callback(new Error('Timeout при получении publicUrl'), null);
    }, 15000);

    const wrappedCallback = (err, result) => {
      clearTimeout(timeout);
      callback(err, result);
    };

    const token = Yandex.getToken();
    if (!token) {
      wrappedCallback(new Error('Токен Яндекс.Диска не установлен'), null);
      return;
    }

    // Шаг 1: Проверяем, опубликован ли файл, и получаем public_key
    const ensurePublished = (cb) => {
      createRequest({
        method: 'GET',
        url: `${Yandex.HOST}/resources`,
        headers: { 'Authorization': `OAuth ${token}` },
        data: { path: path, fields: 'public_url' },
        callback: (err, response) => {
          if (err) {
            cb(err);
            return;
          }
          if (response.public_url) {
            cb(null, response.public_url);
          } else {
            // Публикуем файл
            createRequest({
              method: 'PUT',
              url: `${Yandex.HOST}/resources/publish`,
              headers: { 'Authorization': `OAuth ${token}` },
              data: { path: path },
              callback: (publishErr) => {
                if (publishErr) {
                  cb(publishErr);
                } else {
                  // Повторно запрашиваем public_url
                  createRequest({
                    method: 'GET',
                    url: `${Yandex.HOST}/resources`,
                    headers: { 'Authorization': `OAuth ${token}` },
                    data: { path: path, fields: 'public_url' },
                    callback: (finalErr, finalResponse) => {
                      if (finalErr) {
                        cb(finalErr);
                      } else {
                        cb(null, finalResponse.public_url);
                      }
                    }
                  });
                }
              }
            });
          }
        }
      });
    };

    ensurePublished((err, publicKey) => {
      if (err || !publicKey) {
        wrappedCallback(err || new Error('Не удалось получить публичную ссылку'), null);
        return;
      }

      // Шаг 2: Получаем прямую ссылку на скачивание
      Yandex.getPublicDownloadUrl(publicKey, (dlErr, downloadUrl) => {
        if (dlErr) {
          wrappedCallback(dlErr, null);
        } else {
          wrappedCallback(null, downloadUrl);
        }
      });
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

    fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `OAuth ${token}`,
        'Accept': 'application/json'
      }
    })
    .then(async response => {
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
   * Метод получения всех загруженных файлов в облаке из папки /vk
   */
  static getUploadedFiles(callback) {
    const token = Yandex.getToken();
    if (!token) {
      callback(new Error('Токен Яндекс.Диска не установлен'), null);
      return;
    }

    createRequest({
      method: 'GET',
      url: `${Yandex.HOST}/resources/files`,
      headers: { 'Authorization': `OAuth ${token}` },
      data: {
        fields: 'name,path,modified,size,type,file',
        limit: 100,
        sort: '-modified'
      },
      callback: (err, response) => {
        if (err) {
          console.error('Ошибка получения файлов:', err);
          callback(err, null);
          return;
        }

        const items = response.items || response._embedded?.items || [];
        console.log('Все файлы на диске:', items.map(item => item.path));

        const vkFiles = items.filter(item =>
          item.path && item.path.includes('/vk/')
        );
        console.log('Файлы в папке /vk:', vkFiles.map(item => item.path));

        Yandex.getPublicUrlsForFiles(vkFiles, callback);
      }
    });
  }

  /**
   * Получает публичные ссылки для всех файлов
   */
  static getPublicUrlsForFiles(files, callback) {
    if (!files || files.length === 0) {
      callback(null, []);
      return;
    }

    const results = new Array(files.length);
    let pending = files.length;

    console.log('getPublicUrlsForFiles: начата обработка', files.length, 'файлов');

    const checkDone = () => {
      if (pending === 0) {
        results.sort((a, b) => new Date(b.modified) - new Date(a.modified));
        console.log('getPublicUrlsForFiles: завершена, возвращаем', results.length, 'файлов');
        callback(null, results);
      }
    };

    files.forEach((file, index) => {
      const cachedUrl = Yandex.publicUrlCache.get(file.path);
      if (cachedUrl) {
        console.log(`Файл ${file.path} взят из кэша`);
        results[index] = { ...file, previewUrl: cachedUrl };
        pending--;
        checkDone();
        return;
      }

      console.log(`Запрашиваем publicUrl для ${file.path}`);
      Yandex.getPublicUrl(file.path, (err, publicUrl) => {
        console.log(`Получен ответ для ${file.path}: err=`, err, 'publicUrl=', publicUrl);
        if (err) {
          console.error(`Ошибка получения публичной ссылки для ${file.path}:`, err);
          results[index] = { ...file, previewUrl: null };
        } else {
          Yandex.publicUrlCache.set(file.path, publicUrl);
          results[index] = { ...file, previewUrl: publicUrl };
        }
        pending--;
        checkDone();
      });
    });
  }

  /**
   * Скачивает файл по URL, используя fetch для обхода проблем с Referer
   */
  static downloadFileByUrl(url) {
    if (!url) {
      alert('Не указан URL для скачивания');
      return;
    }

    fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
      }
    })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'download';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) {
          filename = match[1].replace(/['"]/g, '');
        }
      } else {
        try {
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split('/');
          const lastPart = pathParts[pathParts.length - 1];
          if (lastPart && lastPart.includes('.')) {
            filename = decodeURIComponent(lastPart);
          }
        } catch (e) {}
      }

      return response.blob().then(blob => ({ blob, filename }));
    })
    .then(({ blob, filename }) => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    })
    .catch(error => {
      console.error('Ошибка при загрузке через fetch, пробуем window.open', error);
      // Запасной вариант: открыть в новой вкладке с минимальным реферером
      window.open(url, '_blank', 'noopener,noreferrer');
    });
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
      headers: { 'Authorization': `OAuth ${token}` },
      data: { path: '/vk' },
      callback: (err, response) => {
        if (err) {
          if (err.message && err.message.includes('404')) {
            createRequest({
              method: 'PUT',
              url: `${Yandex.HOST}/resources`,
              headers: { 'Authorization': `OAuth ${token}` },
              data: { path: '/vk' },
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