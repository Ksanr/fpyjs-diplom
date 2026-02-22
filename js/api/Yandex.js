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
      method: 'GET', //добавлен /files, удалён data
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
  * Получает публичную ссылку на файл (публикует, если необходимо)
  */
  static getPublicUrl(path, callback) {
    const token = Yandex.getToken();
    if (!token) {
        callback(new Error('Токен Яндекс.Диска не установлен'), null);
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
            callback(err || new Error('Не удалось получить публичную ссылку'), null);
            return;
        }

        // Шаг 2: Получаем прямую ссылку на скачивание по public_key
        Yandex.getPublicDownloadUrl(publicKey, (dlErr, downloadUrl) => {
            if (dlErr) {
                callback(dlErr, null);
            } else {
                callback(null, downloadUrl);
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
  // Метод getUploadedFiles
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
        headers: {
            'Authorization': `OAuth ${token}`
        },
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

            // Проверяем структуру ответа
            const items = response.items || response._embedded?.items || [];
            console.log('Все файлы на диске:', items.map(item => item.path));

            // Фильтруем файлы, содержащие '/vk/' в пути
            const vkFiles = items.filter(item =>
                item.path && item.path.includes('/vk/')
            );
            console.log('Файлы в папке /vk:', vkFiles.map(item => item.path));

            if (vkFiles.length === 0) {
                console.log('Папка /vk пуста или не найдена');
            }

            // Получаем публичные ссылки для предпросмотра
            this.getPublicUrlsForFiles(vkFiles, callback);
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
            filesWithUrls[index] = { ...file, previewUrl: cachedUrl };
            processed++;
            if (processed === total) {
                callback(null, filesWithUrls.sort((a, b) => new Date(b.modified) - new Date(a.modified)));
            }
        } else {
            Yandex.getPublicUrl(file.path, (err, publicUrl) => {
                if (err) {
                    console.error(`Не удалось получить публичную ссылку для ${file.path}:`, err);
                    filesWithUrls[index] = { ...file, previewUrl: null };
                } else {
                    Yandex.publicUrlCache.set(file.path, publicUrl);
                    filesWithUrls[index] = { ...file, previewUrl: publicUrl };
                }
                processed++;
                if (processed === total) {
                    callback(null, filesWithUrls.sort((a, b) => new Date(b.modified) - new Date(a.modified)));
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

  /**
  * Получает прямую ссылку на скачивание по публичной ссылке (public_key)
  */
  static getPublicDownloadUrl(publicKey, callback) {
    createRequest({
        method: 'GET',
        url: `${Yandex.HOST}/public/resources/download`,
        headers: {}, // Без авторизации!
        data: { public_key: publicKey },
        callback: (err, response) => {
            if (err) {
                callback(err, null);
            } else {
                callback(null, response.href);
            }
        }
    });
  }
}