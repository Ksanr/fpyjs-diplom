/**
 * Класс PreviewModal
 * Используется как обозреватель загруженный файлов в облаке
 */
class PreviewModal extends BaseModal {
  constructor(element) {
    super(element);
    this.registerEvents();
  }

  /**
   * Добавляет обработчики событий
   */
  registerEvents() {
    // Закрытие по крестику
    const closeIcon = this.element.querySelector('.x.icon');
    if (closeIcon) {
      closeIcon.addEventListener('click', () => {
        this.close();
      });
    }

    // Обработка кликов в контенте
    const content = this.element.querySelector('.scrolling.content');
    if (content) {
      content.addEventListener('click', (e) => {
        // Клик на кнопке удаления
        if (e.target.closest('.delete')) {
          const button = e.target.closest('.delete');
          const icon = button.querySelector('i');
          const path = button.dataset.path;

          if (!path) {
            alert('Не указан путь к файлу');
            return;
          }

          if (!confirm('Вы уверены, что хотите удалить этот файл?')) {
            return;
          }

          // Показываем индикатор загрузки
          const originalClass = icon.className;
          const originalHTML = button.innerHTML;
          icon.className = 'icon spinner loading';
          button.classList.add('disabled');
          button.innerHTML = icon.outerHTML + ' Удаление...';

          Yandex.removeFile(path, (err, response) => {
            if (err) {
              alert(`Ошибка при удалении: ${err.message}`);
              // Восстанавливаем кнопку
              icon.className = originalClass;
              button.innerHTML = originalHTML;
              button.classList.remove('disabled');
              return;
            }

            // Успешное удаление
            console.log('Удаление успешно:', response);

            // Меняем иконку на успех
            icon.className = 'check icon';
            button.innerHTML = icon.outerHTML + ' Удалено';
            button.classList.remove('disabled');
            button.classList.add('positive');

            // Удаляем контейнер с изображением через 1 секунду
            setTimeout(() => {
              const container = button.closest('.image-preview-container');
              if (container) {
                container.remove();
              }

              // Если больше нет файлов, показываем сообщение
              const remaining = this.element.querySelectorAll('.image-preview-container');
              if (remaining.length === 0) {
                const content = this.element.querySelector('.scrolling.content');
                content.innerHTML = this.getEmptyMessage();
              }
            }, 1000);
          });
        }

        // Клик на кнопке скачивания
        if (e.target.closest('.download')) {
          const button = e.target.closest('.download');
          const fileUrl = button.dataset.file;

          if (!fileUrl) {
            alert('Не указан URL для скачивания');
            return;
          }

          // Показываем индикатор загрузки
          const icon = button.querySelector('i');
          const originalClass = icon.className;
          icon.className = 'icon spinner loading';
          button.classList.add('disabled');

          // Скачиваем файл
          setTimeout(() => {
            Yandex.downloadFileByUrl(fileUrl);

            // Восстанавливаем кнопку через 2 секунды
            setTimeout(() => {
              icon.className = originalClass;
              button.classList.remove('disabled');
            }, 2000);
          }, 500);
        }
      });
    }
  }

   /**
   * Возвращает сообщение при пустой папке
   */
  getEmptyMessage() {
    return `
      <div class="ui placeholder segment" style="width: 100%; margin: 50px auto; text-align: center;">
        <div class="ui icon header">
          <i class="folder open outline icon" style="font-size: 3em; color: #6c757d;"></i>
          <div class="content" style="margin-top: 20px;">
            Папка /vk/ пуста
            <div class="sub header" style="margin-top: 10px;">
              Загрузите фотографии из VK, нажав кнопку "Отправить на диск"
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Отрисовывает изображения в блоке всплывающего окна
   */
  showImages(data) {
    const content = this.element.querySelector('.scrolling.content');
    if (!content) {
      console.error('Блок .scrolling.content не найден');
      return;
    }

    if (!data || data.length === 0) {
      content.innerHTML = this.getEmptyMessage();
      return;
    }

    console.log('Отрисовываем файлы:', data);

    try {
      // Формируем HTML для каждого файла
      const html = data.map(item => this.getImageInfo(item)).join('');
      content.innerHTML = html;

    } catch (error) {
      console.error('Ошибка при отрисовке изображений:', error);
      content.innerHTML = `
        <div class="ui negative message" style="width: 100%;">
          <div class="header">Ошибка при отображении файлов</div>
          <p>${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * Проверяет, является ли файл изображением
   */
  isImageFile(filename) {
    if (!filename) return false;
    return /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(filename);
  }

  /**
   * Форматирует дату в удобный формат
   */
  formatDate(dateString) {
    if (!dateString) return 'Неизвестно';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Неизвестно';
      }

      const months = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
      ];

      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');

      return `${day} ${month} ${year} г. в ${hours}:${minutes}`;
    } catch (error) {
      console.error('Ошибка форматирования даты:', error);
      return 'Неизвестно';
    }
  }

  /**
   * Форматирует размер файла
   */
  formatSize(bytes) {
    if (!bytes) return 'Неизвестно';

    if (bytes < 1024) {
      return `${bytes} Б`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} КБ`;
    } else if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
    } else {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ГБ`;
    }
  }

  /**
   * Возвращает разметку для файла
   */
  getImageInfo(item) {
    if (!item) return '';

    const name = item.name || 'Без имени';
    const size = this.formatSize(item.size);
    const date = this.formatDate(item.modified);
    const path = item.path || '';
    const isImage = this.isImageFile(name);
    const previewUrl = item.previewUrl || '';
    // Вместо const downloadUrl = item.file || '';
    const downloadUrl = item.previewUrl || item.file || '';

    // Убираем папку /vk/ из отображаемого имени
    const displayName = name.startsWith('/vk/') ? name.substring(4) : name;

    // Обрезаем длинные имена
    const shortName = displayName.length > 30
      ? displayName.substring(0, 27) + '...'
      : displayName;

    // Для изображений используем полученную публичную ссылку для предпросмотра
    // Для не-изображений показываем иконку
    let imageHtml = '';

    if (isImage && previewUrl) {
      imageHtml = `
        <img src="${previewUrl}"
          alt="${displayName}"
          style="width: 100%; height: 200px; object-fit: contain;"
          onerror="window.handleImageError(this)" />
      `;
    } else if (isImage) {
      imageHtml = `
        <div class="no-image" style="width: 100%; height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #6c757d;">
          <i class="image outline icon massive"></i>
          <p style="margin-top: 10px;">Нет превью</p>
        </div>
      `;
    } else {
      imageHtml = `
        <div class="file-icon" style="text-align: center; padding: 40px 0; color: #6c757d;">
          <i class="file outline icon massive"></i>
          <p style="margin-top: 10px; font-size: 12px;">${name.split('.').pop().toUpperCase() || 'ФАЙЛ'}</p>
        </div>
      `;
    }

    return `
      <div class="image-preview-container" data-file-path="${path}">
        <div class="image-wrapper" style="margin-bottom: 15px;">
          ${imageHtml}
        </div>
        <table class="ui celled compact table">
          <tbody>
            <tr>
              <td class="collapsing"><strong>Имя:</strong></td>
              <td title="${displayName}">${shortName}</td>
            </tr>
            <tr>
              <td class="collapsing"><strong>Дата:</strong></td>
              <td>${date}</td>
            </tr>
            <tr>
              <td class="collapsing"><strong>Размер:</strong></td>
              <td>${size}</td>
            </tr>
            <tr>
              <td class="collapsing"><strong>Тип:</strong></td>
              <td>${isImage ? 'Изображение' : 'Файл'}</td>
            </tr>
          </tbody>
        </table>
        <div class="buttons-wrapper">
          <button class="ui labeled icon red basic button delete" data-path="${path}"
                  title="Удалить файл с Яндекс.Диска">
            <i class="trash icon"></i>
            Удалить
          </button>
          <button class="ui labeled icon violet basic button download"
                  data-file="${downloadUrl}"
                  data-filename="${displayName}"
                  title="Скачать файл на компьютер"
                  ${!downloadUrl ? 'disabled' : ''}>
            <i class="download icon"></i>
            Скачать
          </button>
        </div>
      </div>
    `;
  }
}