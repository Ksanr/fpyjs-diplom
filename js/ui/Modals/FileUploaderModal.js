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
   * Генерирует уникальное имя файла на основе URL
   */
  generateFileName(url, index = 0) {
    try {
      // Извлекаем имя файла из URL или генерируем уникальное
      let fileName = '';
      const urlObj = new URL(url);

      // Пытаемся извлечь имя файла из пути
      const pathParts = urlObj.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];

      if (lastPart && lastPart.includes('.')) {
        // Если в последней части есть точка, используем ее как имя файла
        fileName = lastPart.split('?')[0]; // Убираем query параметры
      } else {
        // Генерируем имя файла
        const timestamp = Date.now();
        const randomStr = Math.random().toString(16).substring(2, 8);
        fileName = `photo_${timestamp}_${randomStr}_${index}.jpg`;
      }

      // Очищаем имя файла от недопустимых символов
      fileName = this.sanitizeFileName(fileName);

      // Добавляем папку /vk/
      return `/vk/${fileName}`;
    } catch (error) {
      console.error('Ошибка генерации имени файла:', error);
      const timestamp = Date.now();
      const randomStr = Math.random().toString(16).substring(2, 8);
      return `/vk/photo_${timestamp}_${randomStr}_${index}.jpg`;
    }
  }

  /**
   * Очищает имя файла от недопустимых символов
   */
  sanitizeFileName(fileName) {
    // Убираем недопустимые символы для Яндекс.Диска
    return fileName
      .replace(/[\\/:*?"<>|]/g, '_') // Заменяем недопустимые символы
      .replace(/\s+/g, '_') // Заменяем пробелы на подчеркивания
      .replace(/_{2,}/g, '_') // Убираем двойные подчеркивания
      .substring(0, 255); // Ограничиваем длину
  }

  /**
   * Отображает все полученные изображения в теле всплывающего окна
   */
  showImages(images) {
    const content = this.element.querySelector('.scrolling.content');
    const html = images.map((image, index) => this.getImageHTML(image, index)).join('');
    content.innerHTML = html;
  }

  /**
   * Формирует HTML разметку с изображением, полем ввода для имени файла и кнопкой загрузки
   */
  getImageHTML(item, index) {
    const defaultFileName = this.generateFileName(item.url, index);

    return `
      <div class="image-preview-container">
        <img src="${item.url}" />
        <div class="ui action input">
          <input type="text" placeholder="Путь к файлу" value="${defaultFileName}">
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
    containers.forEach((container, index) => {
      setTimeout(() => {
        this.sendImage(container);
      }, index * 500); // Задержка между отправками, чтобы избежать лимитов API
    });
  }

  /**
   * Валидирует изображение и отправляет его на сервер
   */
  sendImage(imageContainer) {
    const input = imageContainer.querySelector('input');
    let path = input.value.trim();

    // Если путь не указан, используем сгенерированное имя
    if (!path) {
      const img = imageContainer.querySelector('img');
      const index = Array.from(this.element.querySelectorAll('.image-preview-container')).indexOf(imageContainer);
      path = this.generateFileName(img.src, index);
      input.value = path;
    }

    // Добавляем папку /vk/ если ее нет в начале пути
    if (!path.startsWith('/vk/')) {
      path = `/vk/${path.replace(/^\/+/, '')}`;
      input.value = path;
    }

    // Блокируем поле ввода
    const inputContainer = input.closest('.ui.action.input');
    inputContainer.classList.add('disabled');

    // Убираем ошибки
    inputContainer.classList.remove('error');

    const imageUrl = imageContainer.querySelector('img').src;

    // Сначала убедимся, что папка /vk существует
    Yandex.ensureVkFolder((err, response) => {
      if (err) {
        console.error('Ошибка при создании папки /vk:', err);
        inputContainer.classList.remove('disabled');
        alert(`Ошибка при создании папки: ${err.message}`);
        return;
      }

      // Затем загружаем файл
      Yandex.uploadFile(path, imageUrl, (uploadErr, uploadResponse) => {
        if (uploadErr) {
          console.error('Ошибка при загрузке файла:', uploadErr);
          inputContainer.classList.remove('disabled');
          inputContainer.classList.add('error');

          // Если файл уже существует, предлагаем переименовать
          if (uploadErr.message && uploadErr.message.includes('409')) {
            const newName = prompt('Файл с таким именем уже существует. Введите новое имя:', path);
            if (newName && newName.trim()) {
              input.value = newName.trim();
              inputContainer.classList.remove('error');
            }
          } else {
            alert(`Ошибка при загрузке: ${uploadErr.message}`);
          }
          return;
        }

        // Успешная загрузка
        console.log('Файл успешно загружен:', uploadResponse);

        // Добавляем анимацию успеха
        const button = imageContainer.querySelector('.button');
        const icon = button.querySelector('i');
        icon.className = 'check icon';
        button.classList.add('positive');

        // Через 1 секунду удаляем контейнер
        setTimeout(() => {
          imageContainer.remove();

          // Если больше нет изображений, закрываем модалку
          const remaining = this.element.querySelectorAll('.image-preview-container');
          if (remaining.length === 0) {
            this.close();
          }
        }, 1000);
      });
    });
  }
}