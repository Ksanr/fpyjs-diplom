/**
 * Класс TokenModal
 * Используется для управления токенами VK и Yandex
 */
class TokenModal extends BaseModal {
  constructor(element) {
    super(element);
    this.vkTokenInput = this.element.querySelector('#vk-token');
    this.yandexTokenInput = this.element.querySelector('#yandex-token');
    this.showVkTokenCheckbox = this.element.querySelector('#show-vk-token');
    this.showYandexTokenCheckbox = this.element.querySelector('#show-yandex-token');
    this.saveButton = this.element.querySelector('.save-tokens');
    this.clearButton = this.element.querySelector('.clear-tokens');
    this.closeButton = this.element.querySelector('.close-token-modal');

    this.registerEvents();
    this.loadTokens();
  }

  /**
   * Добавляет обработчики событий
   */
  registerEvents() {
    // Закрытие по крестику
    this.element.querySelector('.x.icon').addEventListener('click', () => {
      this.close();
    });

    // Кнопка закрытия
    this.closeButton.addEventListener('click', () => {
      this.close();
    });

    // Кнопка сохранения токенов
    this.saveButton.addEventListener('click', () => {
      this.saveTokens();
    });

    // Кнопка очистки токенов
    this.clearButton.addEventListener('click', () => {
      this.clearTokens();
    });

    // Переключение видимости токена VK
    this.showVkTokenCheckbox.addEventListener('change', (e) => {
      this.toggleTokenVisibility(this.vkTokenInput, e.target.checked);
    });

    // Переключение видимости токена Яндекс
    this.showYandexTokenCheckbox.addEventListener('change', (e) => {
      this.toggleTokenVisibility(this.yandexTokenInput, e.target.checked);
    });

    // При открытии модального окна загружаем токены
    this.jQueryElement.on('show', () => {
      this.loadTokens();
    });
  }

  /**
   * Переключает видимость токена
   */
  toggleTokenVisibility(inputElement, show) {
    inputElement.type = show ? 'text' : 'password';
  }

  /**
   * Загружает сохраненные токены из localStorage
   */
  loadTokens() {
    // Загружаем токен VK
    const vkToken = localStorage.getItem('vkToken');
    if (vkToken) {
      this.vkTokenInput.value = vkToken;
    } else {
      // Если нет сохраненного токена, используем дефолтный
      this.vkTokenInput.value = VK.ACCESS_TOKEN_DEFAULT || VK.ACCESS_TOKEN;
    }

    // Загружаем токен Яндекс
    const yandexToken = localStorage.getItem('yandexToken');
    if (yandexToken) {
      this.yandexTokenInput.value = yandexToken;
    } else {
      this.yandexTokenInput.value = '';
    }

    // Сбрасываем чекбоксы показа токенов
    this.showVkTokenCheckbox.checked = false;
    this.showYandexTokenCheckbox.checked = false;
    this.toggleTokenVisibility(this.vkTokenInput, false);
    this.toggleTokenVisibility(this.yandexTokenInput, false);
  }

  /**
   * Сохраняет токены в localStorage
   */
  saveTokens() {
    const vkToken = this.vkTokenInput.value.trim();
    const yandexToken = this.yandexTokenInput.value.trim();

    let isValid = true;

    // Валидация токена VK
    if (!vkToken) {
      this.showError(this.vkTokenInput, 'Токен VK не может быть пустым');
      isValid = false;
    } else if (vkToken.length < 20) {
      this.showError(this.vkTokenInput, 'Токен VK слишком короткий');
      isValid = false;
    } else {
      this.clearError(this.vkTokenInput);
    }

    // Валидация токена Яндекс
    if (!yandexToken) {
      this.showError(this.yandexTokenInput, 'Токен Яндекс.Диска не может быть пустым');
      isValid = false;
    } else if (yandexToken.length < 20) {
      this.showError(this.yandexTokenInput, 'Токен Яндекс.Диска слишком короткий');
      isValid = false;
    } else {
      this.clearError(this.yandexTokenInput);
    }

    if (!isValid) {
      return;
    }

    // Сохраняем токены
    localStorage.setItem('vkToken', vkToken);
    localStorage.setItem('yandexToken', yandexToken);

    // Обновляем токены в классах
    VK.setAccessToken(vkToken);

    // Показываем сообщение об успехе
    this.showSuccess('Токены успешно сохранены!');

    // Закрываем окно через 1 секунду
    setTimeout(() => {
      this.close();
    }, 1000);
  }

  /**
   * Очищает сохраненные токены
   */
  clearTokens() {
    if (confirm('Вы уверены, что хотите очистить все сохраненные токены?')) {
      localStorage.removeItem('vkToken');
      localStorage.removeItem('yandexToken');

      // Сбрасываем поля ввода
      this.vkTokenInput.value = VK.ACCESS_TOKEN_DEFAULT || VK.ACCESS_TOKEN;
      this.yandexTokenInput.value = '';

      this.showSuccess('Токены успешно очищены!');

      // Обновляем токены в классах
      VK.resetAccessToken();
    }
  }

  /**
   * Показывает ошибку для поля ввода
   */
  showError(inputElement, message) {
    const field = inputElement.closest('.field');
    field.classList.add('error');

    // Удаляем старое сообщение об ошибке
    const oldError = field.querySelector('.ui.pointing.red.basic.label');
    if (oldError) {
      oldError.remove();
    }

    // Добавляем новое сообщение об ошибке
    const errorLabel = document.createElement('div');
    errorLabel.className = 'ui pointing red basic label';
    errorLabel.textContent = message;
    field.appendChild(errorLabel);
  }

  /**
   * Очищает ошибку для поля ввода
   */
  clearError(inputElement) {
    const field = inputElement.closest('.field');
    field.classList.remove('error');

    // Удаляем сообщение об ошибке
    const errorLabel = field.querySelector('.ui.pointing.red.basic.label');
    if (errorLabel) {
      errorLabel.remove();
    }
  }

  /**
   * Показывает сообщение об успехе
   */
  showSuccess(message) {
    // Удаляем старое сообщение
    const oldMessage = this.element.querySelector('.ui.positive.message');
    if (oldMessage) {
      oldMessage.remove();
    }

    const messageElement = document.createElement('div');
    messageElement.className = 'ui positive message';
    messageElement.innerHTML = `
      <div class="header">Успешно!</div>
      <p>${message}</p>
    `;

    const content = this.element.querySelector('.content');
    content.insertBefore(messageElement, content.firstChild);

    // Автоматически скрываем сообщение через 3 секунды
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.remove();
      }
    }, 3000);
  }
}