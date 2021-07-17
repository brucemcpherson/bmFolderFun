/**
 * get folder path from a folder object, or a folder object from a path
 */
class FolderFun {
  constructor(driveApp) {
    this.driveApp = driveApp
  }

  /**
   * @param {string} [path='/] the path to find
   * @returns {Folder | null} a drive folder
   */
  folderFromPath(path = '/') {
    return (path || "/").split("/").reduce((prev, current) => {
      if (prev && current) {
        const fldrs = prev.getFoldersByName(current);
        return fldrs.hasNext() ? fldrs.next() : null;
      }
      else {
        return current ? null : prev;
      }
    }, this.driveApp.getRootFolder());
  }

  /**
   * @param {string} [folder=null] the folder to get the path of
   * @returns {Folder | null} a drive folder
   */
  pathFromFolder(folder = null, path = '/') {

    if (!folder) return '';

    if (folder.getId() === this.driveApp.getRootFolder().getId()) {
      return path;
    }
    else {
      return this.pathFromFolder(folder.getParents().next(), '/' + folder.getName() + path);
    }
  }

  /**
   * @param {string} path the path including the folder and filename
   * @returns {Files | null} the matching files
   */
  getFiles(path) {
    // strip the filename
    const fileName = path.replace(/.*\/(.*)$/, "$1")
    const folderName = path.replace(/(.*\/).*$/, "$1")
    const folder = this.folderFromPath(folderName)
    return folder ? folder.getFilesByName(fileName) : null
  }

  /**
   * @param {string} path the path including the folder and filename
   * @returns {File | null} the first matching file
   */
  getFile(path) {
    // strip the filename
    const files = this.getFiles(path)
    return (files && files.hasNext() && files.next()) || null
  }

  /**
   * @param {Files|Folders} files a files iterator - its not a real iterator
   * @return {Iterator} for the files
   */
  iterator(files) {
    return {
      [Symbol.iterator]() {
        return {
          next() {
            const done = !(files && files.hasNext())
            return done ? { done } : { value: files.next() }
          }
        }
      }
    }
  }

  /**
   * from a folder path get an iterator for all the files in it
   * @param {string} path a folder path
   * @return {Iterator} for the files
   */
  iteratorFromFolderPath(path) {
    const folder = this.folderFromPath(path)
    return this.iterator((folder && folder.getFiles()) || null)
  }

  /**
   * get an object describing all the files in a folder structure
   * @param {object} options
   * @param {Folder|| string} options.start a Drive folder or a path
   * @param {boolean} [options.includeSubfolders = false] whether to search in subfolder as well
   * @param {string[]} [options.mimeTypes = null] a list of mimetypes to check for 
   */
  pileOfFiles ({ start, includeSubfolders = false, mimeTypes = null })  {
    const folder = typeof start === 'string' ? this.folderFromPath(start) : start
    if (!folder) {
      throw new Error('start folder not found');
    }


    /**
    * get all the files in a gven folder
    * @param {folder} folder where to start
    * @param {string[]} [mimeTypes] the mime types to include
    * @param {string} folderPath to avoid recaclulating each time we'll do a build up using this
    * @return {[files]}  the files
    */
    const getFiles = ({ folder, mimeTypes, folderPath }) => {
      // because we want this for documentation
      const folderId = folder.getId();
      mimeTypes = mimeTypes && !Array.isArray(mimeTypes) ? [mimeTypes] : mimeTypes
      // optimize if there's only 1 or no mimetype
      const files = mimeTypes && mimeTypes.length === 1 ? folder.getFilesByType(mimeTypes[0]) : folder.getFiles()
      return Array.from(this.iterator(files))
        .filter(file => !mimeTypes || mimeTypes.length === 1 || mimeTypes.indexOf(file.getMimeType()) !== -1)
        .map(file => ({
          folderPath,
          fileName: file.getName(),
          mimeType: file.getMimeType(),
          folderId,
          fileId: file.getId(),
          owner: file.getOwner().getEmail()
        }))

    }
    /**
    * get all the files in this folder
    * @param {folder} folder where to start
    * @param {string} [mime] the mime type
    * @param {[files]} [pile] the growing pike of files
    * @param {string} folderPath the growing folder path
    * @return {[files]}  the growing pike of files
    */
    const pileFiles = ({ folder, mimeTypes, folderPath, pile = [] }) => {
      Array.prototype.push.apply(pile, getFiles({ folder, mimeTypes, folderPath }));
      return pile;
    }



    /**
    * get all the files in this and child folders
    * @param {folder} parent where to start
    * @param {string} [mime] the mime type
    * @param {[files]} [pile] the growing pike of files
    * @return {[files]}  the growing pike of files
    */
    const recurseFolders = ({ parent, mimeTypes, pile, folderPath }) => {
      if (!parent) return pile

      // get the folders from the next level
      const folders = this.iterator(parent.getFolders());
      for (let folder of folders) {
        pile = recurseFolders({ parent: folder, mimeTypes, pile, folderPath: folderPath + '/' + folder.getName() })
      }

      // collect from this folder
      return pileFiles({ folder: parent, mimeTypes, pile, folderPath });

    }

    // this will be the start folderPath
    // it has a trailing '/' that we'll not need if recursing
    const folderPath = this.pathFromFolder(folder)
    // if no subfolders just return matches at this level
    return includeSubfolders ? recurseFolders({ parent: folder, mimeTypes, folderPath: folderPath.replace(/\/$/, '') }) : pileFiles({ folder, mimeTypes, folderPath })
  }


}

var paths = (driveApp) => new FolderFun(driveApp)

