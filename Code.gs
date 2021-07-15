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
  iterator (files) {
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
  iteratorFromFolderPath (path) {
    const folder = this.folderFromPath(path)
    return this.iterator((folder && folder.getFiles()) || null)
  }
}

var paths = (driveApp) => new FolderFun(driveApp)

