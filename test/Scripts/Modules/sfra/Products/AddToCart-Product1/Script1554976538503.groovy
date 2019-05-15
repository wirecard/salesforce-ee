import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import internal.GlobalVariable as GlobalVariable

WebUI.setText(findTestObject('sfra/homepage/Searchbox'), productId)

WebUI.waitForElementClickable(findTestObject('sfra/product page/Link to Product'), 5)

WebUI.click(findTestObject('sfra/product page/Link to Product'))

WebUI.click(findTestObject('sfra/product page/Swatch/JJ887XX'))

WebUI.waitForElementNotPresent(findTestObject('sfra/Loader Underlay'), 10)

WebUI.waitForElementClickable(findTestObject('sfra/product page/Add to cart'), 10)

WebUI.click(findTestObject('sfra/product page/Add to cart'))

WebUI.waitForElementNotPresent(findTestObject('sfra/Loader Underlay'), 10)

