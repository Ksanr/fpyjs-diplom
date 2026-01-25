/**
 * Класс ImageViewer
 * Используется для взаимодействием блоком изображений
 */
class ImageViewer {
  constructor(element) {
    this.element = element;
    this.imageContainer = element.querySelector('.images-list .row:first-of-type');
    this.previewImage = element.querySelector('.ui.fluid.image');
    this.selectAllBtn = element.querySelector('.button.select-all');
    this.showUploadedBtn = element.querySelector('.button.show-uploaded-files');
    this.sendBtn = element.querySelector('.button.send');

    this.registerEvents();
  }

  /**
   * Добавляет обработчики событий
   */
  registerEvents() {
    // Двойной клик по изображению для предпросмотра
    this.imageContainer.addEventListener('dblclick', (e) => {
      if (e.target.tagName === 'IMG') {
        this.previewImage.src = e.target.src;
      }
    });

    // Клик по изображению для выделения
    this.imageContainer.addEventListener('click', (e) => {
      if (e.target.tagName === 'IMG') {
        e.target.classList.toggle('selected');
        this.checkButtonText();
      }
    });

    // Кнопка "Выбрать всё"
    this.selectAllBtn.addEventListener('click', () => {
      const images = this.imageContainer.querySelectorAll('img');
      const hasSelected = Array.from(images).some(img => img.classList.contains('selected'));

      images.forEach(img => {
        if (hasSelected) {
          img.classList.remove('selected');
        } else {
          img.classList.add('selected');
        }
      });

      this.checkButtonText();
    });

    // Кнопка "Посмотреть загруженные файлы"
    this.showUploadedBtn.addEventListener('click', () => {
      console.log('Кнопка "Посмотреть загруженные файлы" нажата');

      const modal = App.getModal('filePreviewer');
      if (!modal) {
        console.error('Модальное окно не найдено');
        return;
      }

      // Очищаем содержимое и показываем лоадер
      const content = modal.element.querySelector('.scrolling.content');
      content.innerHTML = '<i class="asterisk loading icon massive"></i>';

      // Открываем модальное окно
      modal.open();

      // Получаем файлы с Яндекс.Диска
      Yandex.getUploadedFiles((err, response) => {
        console.log('Ответ от Яндекс.Диска:', err, response);

        if (err) {
          content.innerHTML = `<p>Ошибка: ${err.message}</p>`;
          return;
        }

        // Проверяем структуру ответа
        if (response && response.items) {
          modal.showImages(response.items);
        } else {
          content.innerHTML = '<p>Нет загруженных файлов или неверный формат ответа</p>';
        }
      });
    });

    // Кнопка "Отправить на диск"
    this.sendBtn.addEventListener('click', () => {
      const selectedImages = this.imageContainer.querySelectorAll('img.selected');
      if (selectedImages.length === 0) {
        alert('Выберите хотя бы одно изображение для отправки');
        return;
      }

      const modal = App.getModal('fileUploader');
      const images = Array.from(selectedImages).map(img => ({ url: img.src }));

      modal.open();
      modal.showImages(images);
    });
  }

  /**
   * Очищает отрисованные изображения
   */
  clear() {
    this.imageContainer.innerHTML = '';
    this.checkButtonText();
  }

  /**
   * Отрисовывает изображения
   */
  drawImages(images) {
    if (!images || images.length === 0) {
      this.selectAllBtn.classList.add('disabled');
      alert('Изображения не найдены');
      return;
    }

    this.selectAllBtn.classList.remove('disabled');

    images.forEach(imageUrl => {
      const column = document.createElement('div');
      column.className = 'four wide column ui medium image-wrapper';

      const img = document.createElement('img');
      img.src = imageUrl;

      column.appendChild(img);
      this.imageContainer.appendChild(column);
    });

    this.checkButtonText();
  }

  /**
   * Контроллирует кнопки выделения всех изображений и отправки изображений на диск
   */
  checkButtonText() {
    const images = this.imageContainer.querySelectorAll('img');
    const selectedImages = this.imageContainer.querySelectorAll('img.selected');

    // Кнопка "Выбрать всё"
    if (images.length > 0 && selectedImages.length === images.length) {
      this.selectAllBtn.textContent = 'Снять выделение';
    } else {
      this.selectAllBtn.textContent = 'Выбрать всё';
    }

    // Кнопка "Отправить на диск"
    if (selectedImages.length > 0) {
      this.sendBtn.classList.remove('disabled');
    } else {
      this.sendBtn.classList.add('disabled');
    }
  }
}