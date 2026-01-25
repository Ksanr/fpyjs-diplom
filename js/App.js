/**
 * Класс App управляет всем приложением
 */
class App {
  /**
   * С вызова этого метода начинается работа всего приложения
   */
  static init() {
    this.searchBlock = new SearchBlock(document.querySelector('.search-block'));
    this.imageViewer = new ImageViewer(document.querySelector('.images-wrapper'));
    this.initModals();
    this.initTokenManagerButton();
  }

  /**
   * Инициализирует всплывающие окна
   */
  static initModals() {
    // Инициализируем модальные окна через Semantic UI
    $('.ui.modal.file-uploader-modal').modal({
      closable: false,
      onDeny: function() {
        return true;
      }
    });

    $('.ui.modal.uploaded-previewer-modal').modal({
      closable: false,
      onDeny: function() {
        return true;
      }
    });

    $('.ui.modal.token-manager-modal').modal({
      closable: true,
      onDeny: function() {
        return true;
      }
    });

    // Создаем экземпляры классов модальных окон
    this.modals = {
      fileUploader: new FileUploaderModal($('.ui.modal.file-uploader-modal')),
      filePreviewer: new PreviewModal($('.ui.modal.uploaded-previewer-modal')),
      tokenManager: new TokenModal($('.ui.modal.token-manager-modal'))
    };
  }

  /**
   * Инициализирует кнопку управления токенами
   */
  static initTokenManagerButton() {
    const tokenButton = document.querySelector('.token-manager');
    if (tokenButton) {
      tokenButton.addEventListener('click', () => {
        console.log('Открываем окно управления токенами');
        this.modals.tokenManager.open();
      });
    }
  }

  /**
   * Возвращает всплывающее окно
   */
  static getModal(name) {
    return this.modals[name];
  }
}