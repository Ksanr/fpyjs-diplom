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

    // Если токена нет в localStorage, показываем окно управления токенами
    if (!token) {
      console.log('Токен Яндекс.Диска не найден. Открываем окно управления токенами...');

      // Показываем уведомление
      if (App.getModal('tokenManager')) {
        App.getModal('tokenManager').open();
      } else {
        // Если окно управления токенами не инициализировано, используем prompt
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
        path: encodeURIComponent(path),
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
      callback(new Error('Токен Яндекс.Диска не установлен. Установите токен в окне управления токенами.'), null);
      return;
    }

    createRequest({
      method: 'GET',
      url: `${Yandex.HOST}/resources/files`,
      headers: {
        'Authorization': `OAuth ${token}`
      },
      callback: callback
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
}