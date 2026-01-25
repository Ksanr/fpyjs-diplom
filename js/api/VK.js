/**
 * Класс VK
 * Управляет изображениями из VK. С помощью VK API.
 */
class VK {
  static ACCESS_TOKEN_DEFAULT = '958eb5d439726565e9333aa30e50e0f937ee432e927f0dbd541c541887d919a7c56f95c04217915c32008';
  static lastCallback;

  /**
   * Возвращает текущий токен (из localStorage или дефолтный)
   */
  static getAccessToken() {
    const savedToken = localStorage.getItem('vkToken');
    return savedToken || this.ACCESS_TOKEN_DEFAULT;
  }

  /**
   * Устанавливает новый токен
   */
  static setAccessToken(token) {
    if (token && token.trim()) {
      localStorage.setItem('vkToken', token.trim());
    }
  }

  /**
   * Сбрасывает токен на дефолтный
   */
  static resetAccessToken() {
    localStorage.removeItem('vkToken');
  }

  /**
   * Получает изображения
   */
  static get(id = '', callback) {
    VK.lastCallback = callback;

    const script = document.createElement('script');
    const userId = id.trim();

    // Используем текущий токен
    const accessToken = VK.getAccessToken();

    // Формируем URL для запроса к VK API
    script.src = `https://api.vk.com/method/photos.get?owner_id=${userId}&album_id=profile&photo_sizes=1&extended=1&access_token=${accessToken}&v=5.131&callback=VK.processData`;

    document.body.appendChild(script);
  }

  /**
   * Обработчик ответа от сервера
   */
  static processData(result) {
    // Удаляем скрипт
    const script = document.querySelector('script[src*="api.vk.com"]');
    if (script) {
      script.remove();
    }

    // Обработка ошибок
    if (result.error) {
      const errorMsg = result.error.error_msg;

      // Если ошибка авторизации, предлагаем обновить токен
      if (result.error.error_code === 5) {
        if (confirm('Ошибка авторизации VK API. Возможно, токен устарел. Хотите открыть окно управления токенами?')) {
          App.getModal('tokenManager')?.open();
        }
      }

      alert(`Ошибка VK API: ${errorMsg}`);
      VK.lastCallback([]);
      VK.lastCallback = () => {};
      return;
    }

    if (!result.response || !result.response.items) {
      VK.lastCallback([]);
      VK.lastCallback = () => {};
      return;
    }

    // Получаем самые крупные изображения
    const photos = result.response.items.map(item => {
      // Ищем самую большую фотографию
      const largest = item.sizes.reduce((max, size) => {
        const sizeValue = size.width * size.height;
        const maxValue = max.width * max.height;
        return sizeValue > maxValue ? size : max;
      });

      return largest.url;
    });

    // Вызываем callback с полученными фотографиями
    VK.lastCallback(photos);
    VK.lastCallback = () => {};
  }
}