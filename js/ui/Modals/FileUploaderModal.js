/**
 * Класс FileUploaderModal
 * Используется как всплывающее окно для загрузки изображений
 */
class FileUploaderModal extends BaseModal {
  constructor(element) {
    super(element);
    this.registerEvents();
  }

  /**
   * Добавляет обработчики событий
   */
  registerEvents() {
    // Закрытие по крестику
    this.element.querySelector('.x.icon').addEventListener('click', () => {
      this.close();
    });

    // Кнопка "Закрыть"
    this.element.querySelector('.close.button').addEventListener('click', () => {
      this.close();
    });

    // Кнопка "Отправить все файлы"
    this.element.querySelector('.send-all.button').addEventListener('click', () => {
      this.sendAllImages();
    });

    // Обработка кликов в контенте
    const content = this.element.querySelector('.scrolling.content');
    content.addEventListener('click', (e) => {
      // Клик на поле ввода
      if (e.target.classList.contains('input') || e.target.tagName === 'INPUT') {
        const inputContainer = e.target.closest('.ui.action.input') || e.target.parentElement;
        inputContainer.classList.remove('error');
      }

      // Клик на кнопке отправки
      if (e.target.classList.contains('icon') || e.target.classList.contains('button')) {
        const button = e.target.closest('.button');
        if (button && button.querySelector('.upload.icon')) {
          const container = button.closest('.image-preview-container');
          this.sendImage(container);
        }
      }
    });
  }

  /**
   * Отображает все полученные изображения
   */
  showImages(images) {
    const content = this.element.querySelector('.scrolling.content');
    const html = images.map(image => this.getImageHTML(image)).join('');
    content.innerHTML = html;
  }

  /**
   * Формирует HTML разметку с изображением
   */
  getImageHTML(item) {
    return `
      <div class="image-preview-container">
        <img src="${item.url}" />
        <div class="ui action input">
          <input type="text" placeholder="Путь к файлу">
          <button class="ui button"><i class="upload icon"></i></button>
        </div>
      </div>
    `;
  }

  /**
   * Отправляет все изображения в облако
   */
  sendAllImages() {
    const containers = this.element.querySelectorAll('.image-preview-container');
    containers.forEach(container => {
      this.sendImage(container);
    });
  }

  /**
   * Валидирует изображение и отправляет его на сервер
   */
  sendImage(imageContainer) {
    const input = imageContainer.querySelector('input');
    const path = input.value.trim();

    if (!path) {
      const inputContainer = input.closest('.ui.action.input');
      inputContainer.classList.add('error');
      return;
    }

    // Блокируем поле ввода
    const inputContainer = input.closest('.ui.action.input');
    inputContainer.classList.add('disabled');

    const imageUrl = imageContainer.querySelector('img').src;

    Yandex.uploadFile(path, imageUrl, (err, response) => {
      if (err) {
        alert(`Ошибка при загрузке: ${err.message}`);
        inputContainer.classList.remove('disabled');
        return;
      }

      // Удаляем контейнер после успешной загрузки
      imageContainer.remove();

      // Если больше нет изображений, закрываем модалку
      const remaining = this.element.querySelectorAll('.image-preview-container');
      if (remaining.length === 0) {
        this.close();
      }
    });
  }
}